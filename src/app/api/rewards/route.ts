import { NextResponse } from "next/server";
import { ADMIN_WALLET_ADDRESS } from "@/lib/admin";
import { DEFAULT_REWARDS, normalizeRewards, type RewardConfig } from "@/lib/rewards";
import { QUESTS } from "@/lib/missions";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";
import type { Quest } from "@/types";

const STORE_KEY = "lunexis:rewards:v1";
const MISSION_STORE_KEY = "lunexis:missions:v1";
export const dynamic = "force-dynamic";

type RewardStore = {
  rewards: RewardConfig[];
};

type MissionStore = {
  quests: Quest[];
};

function missionKeyAliases(value: string) {
  const key = value.trim().toLowerCase();
  if (!key) return [];
  const aliases = new Set([key]);
  if (key.startsWith("custom-")) aliases.add(key.slice("custom-".length));
  else if (/^\d+$/.test(key)) aliases.add(`custom-${key}`);
  return Array.from(aliases);
}

async function readPublishedMissionIds() {
  const store = await readPersistentValue<MissionStore | null>(MISSION_STORE_KEY, null);
  const quests = store?.quests?.length ? store.quests : QUESTS;
  return new Set(quests.flatMap((quest) => missionKeyAliases(quest.id)));
}

function filterRewardsForPublishedMissions(rewards: RewardConfig[], missionIds: Set<string>) {
  return rewards.filter((reward) => (
    reward.missionIds.length === 0 ||
    reward.missionIds.every((missionId) => missionKeyAliases(missionId).some((alias) => missionIds.has(alias)))
  ));
}

export async function GET() {
  const store = await readPersistentValue<RewardStore>(STORE_KEY, { rewards: DEFAULT_REWARDS });
  const missionIds = await readPublishedMissionIds();
  return NextResponse.json({ rewards: filterRewardsForPublishedMissions(normalizeRewards(store.rewards), missionIds) });
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

  try {
    const store = await writePersistentValue<RewardStore>(STORE_KEY, { rewards: normalizeRewards(body.rewards) });
    return NextResponse.json({ rewards: store.rewards });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not publish rewards" }, { status: 503 });
  }
}
