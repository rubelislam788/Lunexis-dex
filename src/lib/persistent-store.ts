import { promises as fs } from "fs";
import path from "path";

type StoreEnvelope = Record<string, unknown>;

const FILE_STORE_PATH = path.join(process.cwd(), ".lunexis-store.json");
const SUPABASE_CONFIG_TABLE = process.env.SUPABASE_CONFIG_TABLE || "lunexis_config";

type PersistentEnvelope<T> = {
  value: T;
  updatedAt?: string;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.VERCEL_KV_REST_API_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.VERCEL_KV_REST_API_TOKEN || "";
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function persistentStorageConfigured() {
  return Boolean(supabaseConfig() || redisConfig()) || !isVercelRuntime();
}

export function persistentStorageBackend() {
  if (supabaseConfig()) return "supabase";
  if (redisConfig()) return "redis";
  return isVercelRuntime() ? "missing" : "file";
}

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function decodeStoredValue<T>(value: unknown, fallback: T): T {
  if (value === null || typeof value === "undefined") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

async function readSupabaseValue<T>(key: string, fallback: T): Promise<PersistentEnvelope<T> | null> {
  const supabase = supabaseConfig();
  if (!supabase) return null;

  const response = await fetch(
    `${supabase.url}/rest/v1/${SUPABASE_CONFIG_TABLE}?key=eq.${encodeURIComponent(key)}&select=value,updated_at&limit=1`,
    {
      headers: supabaseHeaders(supabase.key),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase read failed for ${key}: ${response.status}`);
  }

  const rows = await response.json().catch(() => []) as Array<{ value?: unknown; updated_at?: string }>;
  const row = rows[0];
  if (!row) return { value: fallback };
  return { value: decodeStoredValue<T>(row.value, fallback), updatedAt: row.updated_at };
}

async function writeSupabaseValue<T>(key: string, value: T): Promise<PersistentEnvelope<T> | null> {
  const supabase = supabaseConfig();
  if (!supabase) return null;

  const response = await fetch(`${supabase.url}/rest/v1/${SUPABASE_CONFIG_TABLE}?on_conflict=key`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(supabase.key),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      key,
      value,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Supabase write failed for ${key}: ${response.status}${details ? ` ${details}` : ""}`);
  }

  const rows = await response.json().catch(() => []) as Array<{ value?: unknown; updated_at?: string }>;
  const row = rows[0];
  return { value: decodeStoredValue<T>(row?.value, value), updatedAt: row?.updated_at };
}

async function readFileStore(): Promise<StoreEnvelope> {
  try {
    return JSON.parse(await fs.readFile(FILE_STORE_PATH, "utf8")) as StoreEnvelope;
  } catch {
    return {};
  }
}

async function writeFileStore(store: StoreEnvelope) {
  try {
    await fs.writeFile(FILE_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // File storage is a local-development fallback. Production persistence should use KV/Upstash.
  }
}

function decodeRedisValue<T>(result: unknown, fallback: T): T {
  if (result === null || typeof result === "undefined") return fallback;
  if (typeof result === "string") {
    try {
      return JSON.parse(result) as T;
    } catch {
      return fallback;
    }
  }
  return result as T;
}

export async function readPersistentValue<T>(key: string, fallback: T): Promise<T> {
  const supabase = await readSupabaseValue<T>(key, fallback).catch(() => null);
  if (supabase) return supabase.value;

  const redis = redisConfig();
  if (redis) {
    try {
      const response = await fetch(`${redis.url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${redis.token}` },
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        return decodeRedisValue<T>(data?.result, fallback);
      }
    } catch {
      // Fall through to local cache.
    }
  }

  const store = await readFileStore();
  return (store[key] as T | undefined) ?? fallback;
}

export async function writePersistentValue<T>(key: string, value: T): Promise<T> {
  const supabase = await writeSupabaseValue<T>(key, value).catch((error) => {
    throw error;
  });
  if (supabase) return supabase.value;

  const redis = redisConfig();
  if (redis) {
    try {
      const response = await fetch(`${redis.url}/set/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redis.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
        cache: "no-store",
      });
      if (response.ok) return value;
    } catch {
      // Fall through to local cache.
    }
  }

  if (isVercelRuntime()) {
    throw new Error("Persistent storage is not configured. Add Vercel KV or Upstash Redis env vars before publishing admin changes.");
  }

  const store = await readFileStore();
  store[key] = value as unknown;
  await writeFileStore(store);
  return value;
}

export async function readPersistentEnvelope<T>(key: string, fallback: T): Promise<PersistentEnvelope<T>> {
  const supabase = await readSupabaseValue<T>(key, fallback).catch(() => null);
  if (supabase) return supabase;

  const value = await readPersistentValue<T>(key, fallback);
  return { value };
}
