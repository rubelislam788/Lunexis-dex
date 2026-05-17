import { NextResponse } from "next/server";
import type { Quest } from "@/types";
import { QUESTS } from "@/lib/missions";
import { ADMIN_WALLET_ADDRESS } from "@/lib/admin";
import { persistentStorageBackend, persistentStorageConfigured, readPersistentEnvelope, writePersistentValue } from "@/lib/persistent-store";

const STORE_KEY = "lunexis:missions:v1";
export const dynamic = "force-dynamic";

type MissionStore = {
  quests: Quest[];
};

function isPublicMission(quest: Quest) {
  return !quest.visibility || quest.visibility === "active";
}

function normalizeQuest(value: unknown): Quest | null {
  if (!value || typeof value !== "object") return null;
  const quest = value as Partial<Quest>;
  if (!quest.id || !quest.title || !quest.description) return null;
  const tasks = Array.isArray(quest.tasks) ? quest.tasks.filter((task) => task && typeof task.id === "string" && typeof task.title === "string") : [];
  const now = new Date().toISOString();
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
    visibility: quest.visibility === "inactive" || quest.visibility === "hidden" || quest.visibility === "deleted" ? quest.visibility : "active",
    createdBy: typeof quest.createdBy === "string" ? quest.createdBy : undefined,
    createdAt: typeof quest.createdAt === "string" ? quest.createdAt : now,
    updatedAt: now,
  };
}

export async function GET(request: Request) {
  const adminAddress = request.headers.get("x-admin-wallet")?.toLowerCase();
  const envelope = await readPersistentEnvelope<MissionStore | null>(STORE_KEY, null);
  const store = envelope.value;
  const hasSavedQuests = Boolean(store && Array.isArray(store.quests) && store.quests.length);
  const isAdmin = adminAddress === ADMIN_WALLET_ADDRESS;
  const quests = hasSavedQuests ? store!.quests : QUESTS;
  return NextResponse.json({
    quests: isAdmin ? quests.filter((quest) => quest.visibility !== "deleted") : quests.filter(isPublicMission),
    isDefault: !hasSavedQuests,
    storageConfigured: persistentStorageConfigured(),
    storageBackend: persistentStorageBackend(),
    updatedAt: envelope.updatedAt ?? null,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
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

  try {
    const store = await writePersistentValue<MissionStore>(STORE_KEY, { quests });
    return NextResponse.json({ quests: store.quests });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not publish missions" }, { status: 503 });
  }
}
