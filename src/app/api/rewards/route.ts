import { NextResponse } from "next/server";
import { ADMIN_WALLET_ADDRESS } from "@/lib/admin";
import { DEFAULT_REWARDS, normalizeRewards, type RewardConfig } from "@/lib/rewards";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";

const STORE_KEY = "lunexis:rewards:v1";
export const dynamic = "force-dynamic";

type RewardStore = {
  rewards: RewardConfig[];
};

export async function GET() {
  const store = await readPersistentValue<RewardStore>(STORE_KEY, { rewards: DEFAULT_REWARDS });
  return NextResponse.json({ rewards: normalizeRewards(store.rewards) });
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

  const store = await writePersistentValue<RewardStore>(STORE_KEY, { rewards: normalizeRewards(body.rewards) });
  return NextResponse.json({ rewards: store.rewards });
}
