import { NextResponse } from "next/server";
import { ADMIN_WALLET_ADDRESS } from "@/lib/admin";
import { DEFAULT_REWARDS, normalizeRewards, type RewardConfig } from "@/lib/rewards";

const STORE_KEY = "__lunexisRewardStore";

type RewardStore = {
  rewards: RewardConfig[];
};

function getStore(): RewardStore {
  const globalStore = globalThis as typeof globalThis & { __lunexisRewardStore?: RewardStore };
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = { rewards: DEFAULT_REWARDS };
  }
  return globalStore[STORE_KEY];
}

export async function GET() {
  return NextResponse.json({ rewards: getStore().rewards });
}

export async function POST(request: Request) {
  const adminAddress = request.headers.get("x-admin-wallet")?.toLowerCase();
  if (adminAddress !== ADMIN_WALLET_ADDRESS) {
    return NextResponse.json({ error: "Admin wallet required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rewards)) {
    return NextResponse.json({ error: "Invalid reward payload" }, { status: 400 });
  }

  getStore().rewards = normalizeRewards(body.rewards);
  return NextResponse.json({ rewards: getStore().rewards });
}
