import { NextResponse } from "next/server";
import type { Quest } from "@/types";
import { QUESTS } from "@/lib/missions";

const STORE_KEY = "__arcQuestMissionStore";

type MissionStore = {
  quests: Quest[];
};

function getStore(): MissionStore {
  const globalStore = globalThis as typeof globalThis & { __arcQuestMissionStore?: MissionStore };
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = { quests: QUESTS };
  }
  return globalStore[STORE_KEY];
}

export async function GET() {
  return NextResponse.json({ quests: getStore().quests });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.quests)) {
    return NextResponse.json({ error: "Invalid mission payload" }, { status: 400 });
  }

  getStore().quests = body.quests;
  return NextResponse.json({ quests: getStore().quests });
}
