import { promises as fs } from "fs";
import path from "path";

type StoreEnvelope = Record<string, unknown>;

const FILE_STORE_PATH = path.join(process.cwd(), ".lunexis-store.json");

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.VERCEL_KV_REST_API_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.VERCEL_KV_REST_API_TOKEN || "";
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
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
