import type { ActivityItem, PortfolioBalance, TokenSymbol, UserProfile } from "@/types";

const STORAGE_KEY = "arcquest.profiles.v1";

type ProfileStore = Record<string, UserProfile>;

const DEFAULT_BALANCES: PortfolioBalance[] = [
  { token: "USDC", amount: "0", value: "$0.00", unitPrice: "$1.00 / USDC", chain: "Connected network" },
  { token: "EURC", amount: "0", value: "$0.00", unitPrice: "Price syncing", chain: "Connected network" },
];

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function readStore(): ProfileStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadAllProfiles(): UserProfile[] {
  return Object.values(readStore()).sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.completedMissionIds.length !== a.completedMissionIds.length) {
      return b.completedMissionIds.length - a.completedMissionIds.length;
    }
    return b.rewardsEarned - a.rewardsEarned;
  });
}

function writeStore(store: ProfileStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("arc-profile-updated"));
}

function mergeUnique<T>(a: T[] = [], b: T[] = []) {
  return Array.from(new Set([...a, ...b]));
}

function mergeProfile(current: UserProfile | null | undefined, next: UserProfile): UserProfile {
  if (!current) return next;
  const activityMap = new Map([...(next.activities ?? []), ...(current.activities ?? [])].map((activity) => [activity.id, activity]));
  const defaultUsername = `Operator ${next.walletAddress.slice(2, 6).toUpperCase()}`;
  return {
    ...current,
    ...next,
    avatarDataUrl: next.avatarDataUrl ?? current.avatarDataUrl,
    username: next.username && next.username !== defaultUsername ? next.username : current.username || next.username,
    xUsername: next.xUsername || current.xUsername || "",
    githubUsername: next.githubUsername || current.githubUsername || "",
    xp: Math.max(current.xp ?? 0, next.xp ?? 0),
    xpConverted: Math.max(current.xpConverted ?? 0, next.xpConverted ?? 0),
    rewardsEarned: Math.max(current.rewardsEarned ?? 0, next.rewardsEarned ?? 0),
    rewardTokenTotals: (["USDC", "EURC", "WETH", "ETH", "ARC"] as TokenSymbol[]).reduce<Partial<Record<TokenSymbol, number>>>((totals, token) => {
      const amount = Math.max(Number(current.rewardTokenTotals?.[token] ?? 0), Number(next.rewardTokenTotals?.[token] ?? 0));
      if (amount > 0) totals[token] = amount;
      return totals;
    }, {}),
    wallets: mergeUnique(current.wallets ?? [], next.wallets ?? []),
    completedMissionIds: mergeUnique(current.completedMissionIds ?? [], next.completedMissionIds ?? []),
    claimedRewardIds: mergeUnique(current.claimedRewardIds ?? [], next.claimedRewardIds ?? []),
    activities: Array.from(activityMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 60),
  };
}

export async function loadRemoteProfiles(): Promise<UserProfile[]> {
  const localProfiles = loadAllProfiles();
  const response = await fetch("/api/profiles").catch(() => null);
  if (!response?.ok) return localProfiles;
  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.profiles)) return localProfiles;
  const merged = new Map<string, UserProfile>();
  localProfiles.forEach((profile) => merged.set(normalizeAddress(profile.walletAddress), profile));
  (data.profiles as UserProfile[]).forEach((profile) => merged.set(normalizeAddress(profile.walletAddress), profile));
  return Array.from(merged.values());
}

export async function loadRemoteProfile(address: string): Promise<UserProfile | null> {
  const key = normalizeAddress(address);
  const local = loadProfile(address);
  const response = await fetch(`/api/profiles?address=${encodeURIComponent(address)}`).catch(() => null);
  if (!response?.ok) return local;
  const data = await response.json().catch(() => null);
  if (!data?.profile) return local;
  const merged = mergeProfile(local, data.profile as UserProfile);
  const store = readStore();
  store[key] = merged;
  writeStore(store);
  return merged;
}

function publishProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  void fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  }).catch(() => null);
}

export function createActivity(
  type: ActivityItem["type"],
  title: string,
  description: string,
  token?: TokenSymbol,
  status: ActivityItem["status"] = "completed",
  txHash?: string
): ActivityItem {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title,
    description,
    token,
    txHash,
    status,
    timestamp: new Date().toISOString(),
  };
}

export function getDefaultProfile(address: string): UserProfile {
  return {
    walletAddress: address,
    username: `Operator ${address.slice(2, 6).toUpperCase()}`,
    xUsername: "",
    githubUsername: "",
    wallets: [address],
    xp: 0,
    xpConverted: 0,
    rewardsEarned: 0,
    rewardTokenTotals: {},
    completedMissionIds: [],
    claimedRewardIds: [],
    balances: DEFAULT_BALANCES,
    activities: [
      createActivity("wallet", "Wallet connected", `${address.slice(0, 6)}...${address.slice(-4)} joined Lunexis.`),
    ],
  };
}

export function loadProfile(address?: string): UserProfile | null {
  if (!address) return null;
  const key = normalizeAddress(address);
  const store = readStore();
  const profile = store[key] ?? getDefaultProfile(address);
  if (!store[key]) {
    store[key] = profile;
    writeStore(store);
  }
  return profile;
}

export function saveProfile(profile: UserProfile): UserProfile {
  const store = readStore();
  const key = normalizeAddress(profile.walletAddress);
  const next = mergeProfile(store[key], profile);
  store[key] = next;
  writeStore(store);
  publishProfile(next);
  return next;
}

export function updateProfile(address: string, patch: Partial<UserProfile>): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  return saveProfile({ ...current, ...patch });
}

export function addWalletToProfile(address: string, wallet: string): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  if (current.wallets.some((item) => normalizeAddress(item) === normalizeAddress(wallet))) return current;
  return saveProfile({
    ...current,
    wallets: [...current.wallets, wallet],
    activities: [
      createActivity("wallet", "Wallet linked", `${wallet.slice(0, 6)}...${wallet.slice(-4)} added to profile.`),
      ...current.activities,
    ],
  });
}

export function addActivity(address: string, activity: ActivityItem): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  return saveProfile({ ...current, activities: [activity, ...current.activities].slice(0, 30) });
}

export function completeMission(address: string, missionId: string, xp: number): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  if (current.completedMissionIds.includes(missionId)) return current;
  return saveProfile({
    ...current,
    xp: current.xp + xp,
    completedMissionIds: [...current.completedMissionIds, missionId],
    activities: [
      createActivity("mission", "Mission completed", `Mission reward unlocked for ${xp} XP.`),
      ...current.activities,
    ],
  });
}

export function claimReward(address: string, rewardId: string, amount: number, token: TokenSymbol = "USDC", txHash?: string): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  if (current.claimedRewardIds.includes(rewardId)) return current;
  const rewardTokenTotals = {
    ...(current.rewardTokenTotals ?? {}),
    [token]: (current.rewardTokenTotals?.[token] ?? 0) + amount,
  };
  return saveProfile({
    ...current,
    rewardsEarned: current.rewardsEarned + amount,
    rewardTokenTotals,
    claimedRewardIds: [...current.claimedRewardIds, rewardId],
    activities: [
      createActivity("reward", "Reward claimed", `${amount.toLocaleString()} ${token} paid to your wallet.`, token, "completed", txHash),
      ...current.activities,
    ],
  });
}

export function convertXpReward(address: string, rewardId: string, xpCost: number, amount: number, token: TokenSymbol = "USDC", txHash?: string): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  if (current.claimedRewardIds.includes(rewardId)) return current;
  const nextXpConverted = (current.xpConverted ?? 0) + xpCost;
  const rewardTokenTotals = {
    ...(current.rewardTokenTotals ?? {}),
    [token]: (current.rewardTokenTotals?.[token] ?? 0) + amount,
  };
  return saveProfile({
    ...current,
    xpConverted: nextXpConverted,
    rewardsEarned: current.rewardsEarned + amount,
    rewardTokenTotals,
    claimedRewardIds: [...current.claimedRewardIds, rewardId],
    activities: [
      createActivity("reward", "XP converted", `${xpCost.toLocaleString()} XP converted into ${amount.toLocaleString()} ${token}.`, token, "completed", txHash),
      ...current.activities,
    ],
  });
}
