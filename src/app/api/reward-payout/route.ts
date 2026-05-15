import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, erc20Abi, http, isAddress, parseUnits, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnetChain } from "@/lib/onchain";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC_URL, normalizeRpcUrl } from "@/lib/arc-kit";
import { TOKEN_CONTRACTS, TOKEN_DECIMALS } from "@/lib/tokens";
import type { TokenSymbol } from "@/types";

const PAYOUT_TOKENS = new Set<TokenSymbol>(["USDC", "EURC"]);
type ProfileRecord = { completedMissionIds?: string[]; claimedRewardIds?: string[] } & Record<string, unknown>;
type ProfileStore = Record<string, ProfileRecord>;

function getPrivateKey() {
  const key = process.env.REWARD_PAYOUT_PRIVATE_KEY || process.env.ARC_REWARD_PAYOUT_PRIVATE_KEY || "";
  if (!key) return "";
  return key.startsWith("0x") ? key as `0x${string}` : `0x${key}` as `0x${string}`;
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

  const globalStore = globalThis as typeof globalThis & { __lunexisProfileStore?: ProfileStore };
  const profileStore = globalStore.__lunexisProfileStore ?? (globalStore.__lunexisProfileStore = {});
  const recipientKey = recipient.toLowerCase();
  const profile = profileStore[recipientKey];
  if (profile?.claimedRewardIds?.includes(rewardId)) {
    return NextResponse.json({ error: "Reward already claimed." }, { status: 409 });
  }
  if (requiredMissionIds.length > 0) {
    const completedIds = new Set(profile?.completedMissionIds ?? []);
    const missingIds = requiredMissionIds.filter((missionId: string) => !completedIds.has(missionId));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: `Complete required mission tasks first: ${missingIds.join(", ")}` }, { status: 403 });
    }
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    return NextResponse.json({ error: "Reward payout wallet is not configured. Add REWARD_PAYOUT_PRIVATE_KEY in Vercel environment variables." }, { status: 503 });
  }

  const tokenAddress = TOKEN_CONTRACTS[token]?.[ARC_TESTNET_CHAIN_ID];
  if (!tokenAddress) {
    return NextResponse.json({ error: `${token} contract address is not configured.` }, { status: 503 });
  }

  const account = privateKeyToAccount(privateKey);
  const transport = http(normalizeRpcUrl(ARC_TESTNET_RPC_URL));
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
    completedMissionIds: profile?.completedMissionIds ?? [],
    claimedRewardIds: Array.from(claimedRewardIds),
  };

  return NextResponse.json({ hash, token, amount, recipient, from: account.address });
}
