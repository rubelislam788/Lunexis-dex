import { NextResponse } from "next/server";
import type { TokenSymbol, UserProfile } from "@/types";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";

const STORE_KEY = "lunexis:profiles:v1";
export const dynamic = "force-dynamic";

type ProfileStore = Record<string, UserProfile>;

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function isProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<UserProfile>;
  return typeof profile.walletAddress === "string" && Array.isArray(profile.completedMissionIds) && Array.isArray(profile.claimedRewardIds);
}

function mergeUnique<T>(a: T[] = [], b: T[] = []) {
  return Array.from(new Set([...a, ...b]));
}

function mergeProfile(current: UserProfile | undefined, next: UserProfile): UserProfile {
  if (!current) return next;
  const activityMap = new Map([...(next.activities ?? []), ...(current.activities ?? [])].map((activity) => [activity.id, activity]));
  const defaultUsername = `Operator ${next.walletAddress.slice(2, 6).toUpperCase()}`;
  const rewardTokenTotals: NonNullable<UserProfile["rewardTokenTotals"]> = {};
  (["USDC", "EURC", "WETH", "ETH", "ARC"] as TokenSymbol[]).forEach((token) => {
    const amount = Math.max(Number(current.rewardTokenTotals?.[token] ?? 0), Number(next.rewardTokenTotals?.[token] ?? 0));
    if (amount > 0) rewardTokenTotals[token] = amount;
  });
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
    rewardTokenTotals,
    wallets: mergeUnique(current.wallets ?? [], next.wallets ?? []),
    completedMissionIds: mergeUnique(current.completedMissionIds ?? [], next.completedMissionIds ?? []),
    claimedRewardIds: mergeUnique(current.claimedRewardIds ?? [], next.claimedRewardIds ?? []),
    activities: Array.from(activityMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 60),
  };
}

export async function GET(request: Request) {
  const store = await readPersistentValue<ProfileStore>(STORE_KEY, {});
  const url = new URL(request.url);
  const address = url.searchParams.get("address");
  if (address) {
    return NextResponse.json({ profile: store[normalizeAddress(address)] ?? null });
  }
  return NextResponse.json({ profiles: Object.values(store) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const profile = body?.profile;
  if (!isProfile(profile)) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const store = await readPersistentValue<ProfileStore>(STORE_KEY, {});
  const key = normalizeAddress(profile.walletAddress);
  const merged = mergeProfile(store[key], profile);
  store[key] = merged;
  await writePersistentValue<ProfileStore>(STORE_KEY, store);
  return NextResponse.json({ profile: merged });
}
