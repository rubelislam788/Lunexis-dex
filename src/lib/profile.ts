import type { ActivityItem, PortfolioBalance, TokenSymbol, UserProfile } from "@/types";

const STORAGE_KEY = "arcquest.profiles.v1";

type ProfileStore = Record<string, UserProfile>;

const DEFAULT_BALANCES: PortfolioBalance[] = [
  { token: "ETH", amount: "0", value: "Live", chain: "Connected network" },
  { token: "USDC", amount: "0", value: "$0.00", chain: "Connected network" },
  { token: "EURC", amount: "0", value: "EUR 0.00", chain: "Connected network" },
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
    rewardsEarned: 0,
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
    publishProfile(profile);
  }
  return profile;
}

export function saveProfile(profile: UserProfile): UserProfile {
  const store = readStore();
  store[normalizeAddress(profile.walletAddress)] = profile;
  writeStore(store);
  publishProfile(profile);
  return profile;
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

export function claimReward(address: string, rewardId: string, amount: number): UserProfile {
  const current = loadProfile(address) ?? getDefaultProfile(address);
  if (current.claimedRewardIds.includes(rewardId)) return current;
  return saveProfile({
    ...current,
    rewardsEarned: current.rewardsEarned + amount,
    claimedRewardIds: [...current.claimedRewardIds, rewardId],
    activities: [
      createActivity("reward", "Reward claimed", `${amount} points claimed from mission rewards.`),
      ...current.activities,
    ],
  });
}
