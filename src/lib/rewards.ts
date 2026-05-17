import type { TokenSymbol } from "@/types";

export const XP_TO_USDC_COST = 10000;
export const XP_TO_USDC_AMOUNT = 1;

export interface RewardConfig {
  id: string;
  title: string;
  amount: number;
  token: Extract<TokenSymbol, "USDC" | "EURC">;
  requirement: string;
  missionIds: string[];
  visibility?: "active" | "inactive" | "hidden" | "deleted";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_REWARDS: RewardConfig[] = [
  { id: "reward-bridge", title: "Portfolio Operator Bonus", amount: 8, token: "USDC", requirement: "Complete Arc Liquidity Signal", missionIds: ["q2"] },
  { id: "reward-swap", title: "Swap Pilot Bonus", amount: 5, token: "EURC", requirement: "Complete Lunexis Swap Initiation", missionIds: ["q1"] },
  { id: "reward-route", title: "Route Pathfinder Bonus", amount: 25, token: "USDC", requirement: "Complete advanced swap route mission", missionIds: ["q4"] },
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
      const token = reward.token === "EURC" ? "EURC" : "USDC";
      const requirement = typeof reward.requirement === "string" ? reward.requirement : "";
      const missionIds = Array.isArray(reward.missionIds) ? reward.missionIds.filter((missionId): missionId is string => typeof missionId === "string").map((missionId) => missionId.trim()).filter(Boolean) : [];
      const visibility = reward.visibility === "inactive" || reward.visibility === "hidden" || reward.visibility === "deleted" ? reward.visibility : "active";
      const createdBy = typeof reward.createdBy === "string" ? reward.createdBy : undefined;
      const createdAt = typeof reward.createdAt === "string" ? reward.createdAt : undefined;
      const updatedAt = typeof reward.updatedAt === "string" ? reward.updatedAt : undefined;
      return { id, title, amount, token, requirement, missionIds, visibility, createdBy, createdAt, updatedAt };
    })
    .filter((item): item is RewardConfig => Boolean(item));
  return rewards.length ? rewards : DEFAULT_REWARDS;
}

export function formatRewardAmount(amount: number, token: RewardConfig["token"]) {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 4,
  })} ${token}`;
}

export function formatRewardTotals(totals?: Partial<Record<TokenSymbol, number>>, fallbackAmount = 0) {
  const parts = (["USDC", "EURC"] as const)
    .map((token) => {
      const amount = totals?.[token] ?? 0;
      return amount > 0 ? formatRewardAmount(amount, token) : "";
    })
    .filter(Boolean);

  if (parts.length) return parts.join(" / ");
  if (fallbackAmount > 0) return formatRewardAmount(fallbackAmount, "USDC");
  return "0 USDC";
}
