import { NextResponse } from "next/server";
import type { Quest } from "@/types";
import { QUESTS } from "@/lib/missions";
import { ADMIN_WALLET_ADDRESS } from "@/lib/admin";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";

const STORE_KEY = "lunexis:missions:v1";
export const dynamic = "force-dynamic";

type MissionStore = {
  quests: Quest[];
};

function normalizeQuest(value: unknown): Quest | null {
  if (!value || typeof value !== "object") return null;
  const quest = value as Partial<Quest>;
  if (!quest.id || !quest.title || !quest.description) return null;
  const tasks = Array.isArray(quest.tasks) ? quest.tasks.filter((task) => task && typeof task.id === "string" && typeof task.title === "string") : [];
  return {
    id: String(quest.id),
    title: String(quest.title),
    description: String(quest.description),
    reward: typeof quest.reward === "string" ? quest.reward : "5 USDC",
    rewardAmt: Number.isFinite(Number(quest.rewardAmt)) ? Number(quest.rewardAmt) : 5,
    xp: Number.isFinite(Number(quest.xp)) ? Number(quest.xp) : 250,
    difficulty: quest.difficulty === "Medium" || quest.difficulty === "Hard" || quest.difficulty === "Elite" ? quest.difficulty : "Easy",
    category: typeof quest.category === "string" ? quest.category : "Custom",
    progress: Number.isFinite(Number(quest.progress)) ? Number(quest.progress) : 0,
    totalSteps: Math.max(1, Number.isFinite(Number(quest.totalSteps)) ? Number(quest.totalSteps) : tasks.length || 1),
    tags: Array.isArray(quest.tags) ? quest.tags.filter((tag): tag is string => typeof tag === "string") : ["Custom"],
    tasks,
    featured: Boolean(quest.featured),
    startsAt: typeof quest.startsAt === "string" ? quest.startsAt : undefined,
    endsAt: typeof quest.endsAt === "string" ? quest.endsAt : undefined,
    socialLinks: Array.isArray(quest.socialLinks) ? quest.socialLinks.filter((link) => link && typeof link.id === "string" && typeof link.label === "string" && typeof link.url === "string") : [],
  };
}

export async function GET() {
  const store = await readPersistentValue<MissionStore | null>(STORE_KEY, null);
  const hasSavedQuests = Boolean(store && Array.isArray(store.quests) && store.quests.length);
  return NextResponse.json({ quests: hasSavedQuests ? store!.quests : QUESTS, isDefault: !hasSavedQuests });
}

export async function POST(request: Request) {
  const adminAddress = request.headers.get("x-admin-wallet")?.toLowerCase();
  if (adminAddress !== ADMIN_WALLET_ADDRESS) {
    return NextResponse.json({ error: "Admin wallet required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.quests)) {
    return NextResponse.json({ error: "Invalid mission payload" }, { status: 400 });
  }

  const quests = body.quests.map(normalizeQuest).filter((quest: Quest | null): quest is Quest => Boolean(quest));
  if (!quests.length) {
    return NextResponse.json({ error: "No valid missions to save" }, { status: 400 });
  }

  const store = await writePersistentValue<MissionStore>(STORE_KEY, { quests });
  return NextResponse.json({ quests: store.quests });
}
