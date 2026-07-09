"use server";

import { redis } from "./redis";

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
  if (process.env.NODE_ENV === "development") {
    return { allowed: true, remaining: limit };
  }
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSeconds);
    return { allowed: current <= limit, remaining: Math.max(0, limit - current) };
  } catch {
    return { allowed: true, remaining: limit }; // Redis down, allow through
  }
}
