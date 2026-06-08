// Server-only utility module (no "use server" directive needed — exports non-async values)

import { redis } from "./redis";

// Default TTLs in seconds
const TTL = {
  SHORT: 60,           // 1 min  — volatile data (notifications, home stats)
  MEDIUM: 300,         // 5 min  — lists (leads, contacts, deals)
  LONG: 900,           // 15 min — dashboards, aggregated stats
  VERY_LONG: 3600,     // 1 hr   — org settings, departments, branches
} as const;

export { TTL };

// ---------- core helpers ----------

function stableKey(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

/** Build a tenant-scoped cache key */
export function cacheKey(tenantId: string, ...parts: (string | Record<string, unknown>)[]) {
  const segments = parts.map((p) =>
    typeof p === "string" ? p : stableKey(p)
  );
  return `t:${tenantId}:${segments.join(":")}`;
}

/** Get cached value, or compute + cache it */
export async function cached<T>(
  key: string,
  ttl: number,
  compute: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    // Redis down — fall through to DB
  }

  const result = await compute();

  try {
    await redis.set(key, JSON.stringify(result), "EX", ttl);
  } catch {
    // Redis down — no-op
  }

  return result;
}

/** Invalidate a single key */
export async function invalidate(key: string) {
  try {
    await redis.del(key);
  } catch {
    // Redis down — no-op
  }
}

/** Invalidate all keys matching a pattern (e.g. `t:{tenantId}:leads:*`) */
export async function invalidatePattern(pattern: string) {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        200
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Redis down — no-op
  }
}

/** Invalidate multiple patterns at once */
export async function invalidateMany(patterns: string[]) {
  await Promise.all(patterns.map(invalidatePattern));
}
