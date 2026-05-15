import { NextResponse } from "next/server";
import type { UserProfile } from "@/types";

const STORE_KEY = "__lunexisProfileStore";

type ProfileStore = Record<string, UserProfile>;

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function getStore(): ProfileStore {
  const globalStore = globalThis as typeof globalThis & { __lunexisProfileStore?: ProfileStore };
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {};
  }
  return globalStore[STORE_KEY];
}

function isProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<UserProfile>;
  return typeof profile.walletAddress === "string" && Array.isArray(profile.completedMissionIds) && Array.isArray(profile.claimedRewardIds);
}

export async function GET() {
  return NextResponse.json({ profiles: Object.values(getStore()) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const profile = body?.profile;
  if (!isProfile(profile)) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  getStore()[normalizeAddress(profile.walletAddress)] = profile;
  return NextResponse.json({ profile });
}
