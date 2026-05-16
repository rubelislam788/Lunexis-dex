import { NextResponse } from "next/server";
import { readPersistentValue, writePersistentValue } from "@/lib/persistent-store";

type PreferenceStore = Record<string, unknown>;

const STORE_KEY = "lunexis:preferences:v1";
export const dynamic = "force-dynamic";

function preferenceKey(owner: string, scope: string) {
  return `${owner.trim().toLowerCase()}:${scope.trim().toLowerCase()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner") || "";
  const scope = url.searchParams.get("scope") || "";
  if (!owner || !scope) {
    return NextResponse.json({ error: "Preference owner and scope are required" }, { status: 400 });
  }

  const store = await readPersistentValue<PreferenceStore>(STORE_KEY, {});
  return NextResponse.json({ value: store[preferenceKey(owner, scope)] ?? null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const owner = typeof body?.owner === "string" ? body.owner : "";
  const scope = typeof body?.scope === "string" ? body.scope : "";
  if (!owner || !scope) {
    return NextResponse.json({ error: "Preference owner and scope are required" }, { status: 400 });
  }

  const store = await readPersistentValue<PreferenceStore>(STORE_KEY, {});
  store[preferenceKey(owner, scope)] = body?.value ?? null;
  await writePersistentValue<PreferenceStore>(STORE_KEY, store);
  return NextResponse.json({ value: store[preferenceKey(owner, scope)] });
}
