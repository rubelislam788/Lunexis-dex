import type { MissionSocialLink, MissionTask, Quest } from "@/types";

export const MISSION_TASKS_KEY = "arcquest.mission-tasks.v1";
export const MISSION_STEP_PROOF_KEY = "arcquest.mission-step-proof.v1";
export const MISSION_CUSTOM_KEY = "arcquest.mission-custom.v1";
export const MISSION_CREATED_KEY = "arcquest.mission-created.v1";
export const MISSION_REMOVED_KEY = "arcquest.mission-removed.v1";

export const DEFAULT_MISSION_DAYS = 7;

export type EditableQuestPatch = Partial<Pick<Quest, "title" | "description" | "reward" | "rewardAmt" | "xp" | "difficulty" | "category" | "tags" | "startsAt" | "endsAt" | "socialLinks">>;

export const addDaysIso = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
};

export function ensureMissionSchedule(quests: Quest[]) {
  const createdAt = new Date();
  return quests.map((quest) => {
    const startsAt = quest.startsAt ?? createdAt.toISOString();
    const endsAt = quest.endsAt ?? addDaysIso(new Date(startsAt), DEFAULT_MISSION_DAYS);
    return { ...quest, startsAt, endsAt };
  });
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function hasLocalMissionDrafts() {
  if (typeof window === "undefined") return false;
  return [MISSION_TASKS_KEY, MISSION_CUSTOM_KEY, MISSION_CREATED_KEY, MISSION_REMOVED_KEY].some((key) => {
    const value = window.localStorage.getItem(key);
    return Boolean(value && value !== "{}" && value !== "[]");
  });
}

export function mergeStoredMissions(
  base: Quest[],
  storedTasks: Record<string, MissionTask[]>,
  storedCustom: Record<string, EditableQuestPatch>,
  storedCreated: Quest[],
  removedIds: string[],
) {
  const baseIds = new Set(base.map((quest) => quest.id));
  const created = storedCreated.filter((quest) => !baseIds.has(quest.id));
  const removed = new Set(removedIds);
  return ensureMissionSchedule([...base, ...created].filter((quest) => !removed.has(quest.id)).map((quest) => {
    const custom = storedCustom[quest.id] ?? {};
    const tasks = storedTasks[quest.id]?.length ? storedTasks[quest.id] : quest.tasks ?? [];
    const socialLinks = Array.isArray(custom.socialLinks) ? custom.socialLinks as MissionSocialLink[] : quest.socialLinks;
    return { ...quest, ...custom, socialLinks, tasks, totalSteps: Math.max(1, tasks.length || quest.totalSteps) };
  }));
}

export function loadLocalMissions(base: Quest[]) {
  return mergeStoredMissions(
    base,
    readJson<Record<string, MissionTask[]>>(MISSION_TASKS_KEY, {}),
    readJson<Record<string, EditableQuestPatch>>(MISSION_CUSTOM_KEY, {}),
    readJson<Quest[]>(MISSION_CREATED_KEY, []),
    readJson<string[]>(MISSION_REMOVED_KEY, []),
  );
}

export function saveLocalMissions(nextQuests: Quest[], base: Quest[]) {
  if (typeof window === "undefined") return;
  const stored = nextQuests.reduce<Record<string, EditableQuestPatch>>((acc, quest) => {
    acc[quest.id] = {
      title: quest.title,
      description: quest.description,
      reward: quest.reward,
      rewardAmt: quest.rewardAmt,
      xp: quest.xp,
      difficulty: quest.difficulty,
      category: quest.category,
      tags: quest.tags,
      startsAt: quest.startsAt,
      endsAt: quest.endsAt,
      socialLinks: quest.socialLinks ?? [],
    };
    return acc;
  }, {});
  const storedTasks = nextQuests.reduce<Record<string, MissionTask[]>>((acc, quest) => {
    acc[quest.id] = quest.tasks ?? [];
    return acc;
  }, {});
  const baseIds = new Set(base.map((quest) => quest.id));
  const created = nextQuests.filter((quest) => !baseIds.has(quest.id));
  const removed = base.filter((quest) => !nextQuests.some((item) => item.id === quest.id)).map((quest) => quest.id);
  window.localStorage.setItem(MISSION_CUSTOM_KEY, JSON.stringify(stored));
  window.localStorage.setItem(MISSION_TASKS_KEY, JSON.stringify(storedTasks));
  window.localStorage.setItem(MISSION_CREATED_KEY, JSON.stringify(created));
  window.localStorage.setItem(MISSION_REMOVED_KEY, JSON.stringify(removed));
}
