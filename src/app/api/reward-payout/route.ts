import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, erc20Abi, fallback, http, isAddress, parseUnits, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnetChain } from "@/lib/onchain";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC_URLS } from "@/lib/arc-kit";
import { TOKEN_CONTRACTS, TOKEN_DECIMALS } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";

const PAYOUT_TOKENS = new Set<TokenSymbol>(["USDC", "EURC"]);
type ProfileRecord = { completedMissionIds?: string[]; claimedRewardIds?: string[] } & Record<string, unknown>;
type ProfileStore = Record<string, ProfileRecord>;
const PROFILE_STORE_KEY = "lunexis:profiles:v1";
export const dynamic = "force-dynamic";

function getPrivateKey() {
  const key = process.env.REWARD_PAYOUT_PRIVATE_KEY || process.env.ARC_REWARD_PAYOUT_PRIVATE_KEY || "";
  if (!key) return "";
  return key.startsWith("0x") ? key as `0x${string}` : `0x${key}` as `0x${string}`;
}

function missionKeyAliases(value: string) {
  const key = value.trim().toLowerCase();
  if (!key) return [];
  const aliases = new Set([key]);
  if (key.startsWith("custom-")) aliases.add(key.slice("custom-".length));
  else if (/^\d+$/.test(key)) aliases.add(`custom-${key}`);
  return Array.from(aliases);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rewardId = typeof body?.rewardId === "string" ? body.rewardId : "";
  const token = body?.token as TokenSymbol | undefined;
  const amount = Number(body?.amount);
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

  const profileStore = await readPersistentValue<ProfileStore>(PROFILE_STORE_KEY, {});
  const recipientKey = recipient.toLowerCase();
  const profile = profileStore[recipientKey];
  const completedIds = new Set([...(profile?.completedMissionIds ?? []), ...submittedCompletedMissionIds]);
  const completedMissionKeys = new Set(Array.from(completedIds).flatMap(missionKeyAliases));
  if (profile?.claimedRewardIds?.includes(rewardId)) {
    return NextResponse.json({ error: "Reward already claimed." }, { status: 409 });
  }
  if (requiredMissionIds.length > 0) {
    const missingIds = requiredMissionIds.filter((missionId: string) => !missionKeyAliases(missionId).some((key) => completedMissionKeys.has(key)));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: `Complete required mission tasks first: ${missingIds.join(", ")}` }, { status: 403 });
    }
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    return NextResponse.json({ error: "Reward payouts are temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const tokenAddress = TOKEN_CONTRACTS[token]?.[ARC_TESTNET_CHAIN_ID];
  if (!tokenAddress) {
    return NextResponse.json({ error: `${token} rewards are temporarily unavailable.` }, { status: 503 });
  }

  const account = privateKeyToAccount(privateKey);
  const transport = fallback(ARC_TESTNET_RPC_URLS.map((url) => http(url, { retryCount: 2, timeout: 10000 })), {
    rank: true,
    retryCount: 2,
  });
  const publicClient = createPublicClient({ chain: arcTestnetChain, transport });
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
    return NextResponse.json({ error: `Reward payout wallet has insufficient ${token}.` }, { status: 402 });
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
  };
  await writePersistentValue<ProfileStore>(PROFILE_STORE_KEY, profileStore);

  return NextResponse.json({ hash, token, amount, recipient, from: account.address });
}
