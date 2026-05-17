import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, erc20Abi, fallback, formatUnits, http, isAddress, parseUnits, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnetChain } from "@/lib/onchain";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC_URLS } from "@/lib/arc-kit";
import { TOKEN_CONTRACTS, TOKEN_DECIMALS } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";
import { DEFAULT_REWARDS, normalizeRewards, type RewardConfig } from "@/lib/rewards";

const PAYOUT_TOKENS = new Set<TokenSymbol>(["USDC", "EURC"]);
type ProfileRecord = { completedMissionIds?: string[]; claimedRewardIds?: string[]; xp?: number; xpConverted?: number } & Record<string, unknown>;
type ProfileStore = Record<string, ProfileRecord>;
const PROFILE_STORE_KEY = "lunexis:profiles:v1";
const REWARD_STORE_KEY = "lunexis:rewards:v1";
const MAX_UNPUBLISHED_REWARD_AMOUNT = Number(process.env.MAX_UNPUBLISHED_REWARD_AMOUNT || 25);
export const dynamic = "force-dynamic";
type RewardStore = { rewards?: RewardConfig[] };

function getPrivateKey() {
  const key = process.env.REWARD_PAYOUT_PRIVATE_KEY || process.env.ARC_REWARD_PAYOUT_PRIVATE_KEY || process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.PAYOUT_PRIVATE_KEY || "";
  if (!key) return "";
  return key.startsWith("0x") ? key as `0x${string}` : `0x${key}` as `0x${string}`;
}

function createRewardClients() {
  const transport = fallback(ARC_TESTNET_RPC_URLS.map((url) => http(url, { retryCount: 2, timeout: 10000 })), {
    rank: true,
    retryCount: 2,
  });
  return {
    publicClient: createPublicClient({ chain: arcTestnetChain, transport }),
    transport,
  };
}

function payoutAccount() {
  const privateKey = getPrivateKey();
  if (!privateKey) return null;
  try {
    return privateKeyToAccount(privateKey);
  } catch {
    return null;
  }
}

function missionKeyAliases(value: string) {
  const key = value.trim().toLowerCase();
  if (!key) return [];
  const aliases = new Set([key]);
  if (key.startsWith("custom-")) aliases.add(key.slice("custom-".length));
  else if (/^\d+$/.test(key)) aliases.add(`custom-${key}`);
  return Array.from(aliases);
}

export async function GET() {
  const account = payoutAccount();
  if (!account) {
    return NextResponse.json({
      configured: false,
      error: "Set REWARD_PAYOUT_PRIVATE_KEY to the admin payout wallet private key, then fund that wallet with Arc Testnet USDC/EURC.",
    });
  }

  const { publicClient } = createRewardClients();
  const balances = await Promise.all((["USDC", "EURC"] as TokenSymbol[]).map(async (token) => {
    const tokenAddress = TOKEN_CONTRACTS[token]?.[ARC_TESTNET_CHAIN_ID];
    if (!tokenAddress) return { token, amount: "0", displayAmount: `0 ${token}` };
    const raw = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }).catch(() => BigInt(0));
    const amount = formatUnits(raw, TOKEN_DECIMALS[token]);
    return { token, amount, displayAmount: `${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token}` };
  }));

  return NextResponse.json({ configured: true, address: account.address, balances });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rewardId = typeof body?.rewardId === "string" ? body.rewardId : "";
  const token = body?.token as TokenSymbol | undefined;
  const amount = Number(body?.amount);
  const xpCost = Number(body?.xpCost ?? 0);
  const recipient = body?.recipient as Address | undefined;
  const requiredMissionIds: string[] = Array.isArray(body?.requiredMissionIds)
    ? body.requiredMissionIds
      .filter((id: unknown): id is string => typeof id === "string" && Boolean(id.trim()))
      .map((id: string) => id.trim())
    : [];
  const submittedCompletedMissionIds: string[] = Array.isArray(body?.completedMissionIds)
    ? body.completedMissionIds
      .filter((id: unknown): id is string => typeof id === "string" && Boolean(id.trim()))
      .map((id: string) => id.trim())
    : [];

  if (!token || !PAYOUT_TOKENS.has(token)) {
    return NextResponse.json({ error: "Reward token must be USDC or EURC." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Reward amount must be greater than zero." }, { status: 400 });
  }
  if (!recipient || !isAddress(recipient)) {
    return NextResponse.json({ error: "Valid recipient wallet required." }, { status: 400 });
  }
  if (!rewardId) {
    return NextResponse.json({ error: "Reward id is required." }, { status: 400 });
  }
  if (!Number.isFinite(xpCost) || xpCost < 0) {
    return NextResponse.json({ error: "XP cost must be zero or greater." }, { status: 400 });
  }

  const profileStore = await readPersistentValue<ProfileStore>(PROFILE_STORE_KEY, {});
  const recipientKey = recipient.toLowerCase();
  const profile = profileStore[recipientKey];
  const completedIds = new Set([...(profile?.completedMissionIds ?? []), ...submittedCompletedMissionIds]);
  const completedMissionKeys = new Set(Array.from(completedIds).flatMap(missionKeyAliases));
  if (profile?.claimedRewardIds?.includes(rewardId)) {
    return NextResponse.json({ error: "Reward already claimed." }, { status: 409 });
  }
  if (xpCost > 0) {
    const availableXp = Number(profile?.xp ?? 0) - Number(profile?.xpConverted ?? 0);
    if (!profile || availableXp < xpCost) {
      return NextResponse.json({ error: `You need ${xpCost.toLocaleString()} available XP to claim this reward.` }, { status: 403 });
    }
  }
  if (requiredMissionIds.length > 0) {
    const missingIds = requiredMissionIds.filter((missionId: string) => !missionKeyAliases(missionId).some((key) => completedMissionKeys.has(key)));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: `Complete required mission tasks first: ${missingIds.join(", ")}` }, { status: 403 });
    }
  }

  if (xpCost <= 0) {
    const rewardStore = await readPersistentValue<RewardStore>(REWARD_STORE_KEY, { rewards: DEFAULT_REWARDS });
    const publishedRewards = normalizeRewards(rewardStore.rewards ?? DEFAULT_REWARDS);
    const reward = publishedRewards.find((item) => item.id === rewardId);
    if (!reward) {
      if (requiredMissionIds.length === 0) {
        return NextResponse.json({ code: "REWARD_NOT_PUBLISHED", error: "This reward is not published yet. Ask the admin to save rewards again." }, { status: 404 });
      }
      if (Number.isFinite(MAX_UNPUBLISHED_REWARD_AMOUNT) && amount > MAX_UNPUBLISHED_REWARD_AMOUNT) {
        return NextResponse.json({ code: "REWARD_NOT_PUBLISHED", error: "This custom reward is not published yet. Ask the admin to save rewards before claiming larger payouts." }, { status: 404 });
      }
    } else if (reward.token !== token || Number(reward.amount) !== amount) {
      return NextResponse.json({ error: "Reward details changed. Refresh the Rewards page and try again." }, { status: 409 });
    }
  }

  const account = payoutAccount();
  if (!account) {
    return NextResponse.json({ code: "PAYOUT_WALLET_OFFLINE", error: "Reward payout wallet is not configured. Set REWARD_PAYOUT_PRIVATE_KEY to your admin wallet private key in Vercel, then fund it with Arc Testnet USDC/EURC." }, { status: 503 });
  }

  const tokenAddress = TOKEN_CONTRACTS[token]?.[ARC_TESTNET_CHAIN_ID];
  if (!tokenAddress) {
    return NextResponse.json({ code: "REWARD_TOKEN_OFFLINE", error: `${token} reward token is not ready yet.` }, { status: 503 });
  }

  const { publicClient, transport } = createRewardClients();
  const walletClient = createWalletClient({ account, chain: arcTestnetChain, transport });
  const decimals = TOKEN_DECIMALS[token];
  const value = parseUnits(String(amount), decimals);

  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (balance < value) {
    return NextResponse.json({ error: `Admin payout wallet ${account.address} has insufficient ${token}. Fund this wallet on Arc Testnet before users claim rewards.` }, { status: 402 });
  }

  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, value],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    return NextResponse.json({ error: "Reward payout transaction failed.", hash }, { status: 500 });
  }

  const claimedRewardIds = new Set(profile?.claimedRewardIds ?? []);
  claimedRewardIds.add(rewardId);
  profileStore[recipientKey] = {
    ...(profile ?? {}),
    completedMissionIds: Array.from(completedIds),
    claimedRewardIds: Array.from(claimedRewardIds),
    xpConverted: Number(profile?.xpConverted ?? 0) + xpCost,
  };
  await writePersistentValue<ProfileStore>(PROFILE_STORE_KEY, profileStore);

  return NextResponse.json({ hash, token, amount, recipient, from: account.address });
}
