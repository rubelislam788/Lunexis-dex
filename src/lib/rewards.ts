export interface RewardConfig {
  id: string;
  title: string;
  amount: number;
  requirement: string;
  missionIds: string[];
}

export const DEFAULT_REWARDS: RewardConfig[] = [
  { id: "reward-social", title: "Social Signal Pack", amount: 650, requirement: "Complete all social missions", missionIds: ["social-follow", "social-rubel-post", "social-arc-post"] },
  { id: "reward-bridge", title: "Bridge Operator Bonus", amount: 800, requirement: "Complete Bridge the Arc Gate", missionIds: ["q2"] },
  { id: "reward-swap", title: "Swap Pilot Bonus", amount: 500, requirement: "Complete Lunexis Swap Initiation", missionIds: ["q1"] },
  { id: "reward-route", title: "Route Pathfinder Bonus", amount: 2500, requirement: "Complete swap and bridge route mission", missionIds: ["q4"] },
];

export function normalizeRewards(value: unknown): RewardConfig[] {
  if (!Array.isArray(value)) return DEFAULT_REWARDS;
  const rewards = value
    .map((item): RewardConfig | null => {
      if (!item || typeof item !== "object") return null;
      const reward = item as Partial<RewardConfig>;
      const id = typeof reward.id === "string" && reward.id.trim() ? reward.id.trim() : `reward-${Date.now()}`;
      const title = typeof reward.title === "string" && reward.title.trim() ? reward.title.trim() : "Custom Reward";
      const amount = Number.isFinite(Number(reward.amount)) ? Math.max(0, Number(reward.amount)) : 0;
      const requirement = typeof reward.requirement === "string" ? reward.requirement : "";
      const missionIds = Array.isArray(reward.missionIds) ? reward.missionIds.filter((missionId): missionId is string => typeof missionId === "string").map((missionId) => missionId.trim()).filter(Boolean) : [];
      return { id, title, amount, requirement, missionIds };
    })
    .filter((item): item is RewardConfig => Boolean(item));
  return rewards.length ? rewards : DEFAULT_REWARDS;
}
