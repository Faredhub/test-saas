import Redis from "ioredis";

// In-memory fallback class for development
class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<string> {
    let expiresAt: number | null = null;
    if (mode === "EX" && ttl) {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  async incr(key: string): Promise<number> {
    const val = await this.get(key);
    const num = val ? parseInt(val, 10) + 1 : 1;
    await this.set(key, num.toString());
    return num;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async scan(cursor: string, ...args: any[]): Promise<[string, string[]]> {
    let pattern: string | null = null;
    const matchIdx = args.indexOf("MATCH");
    if (matchIdx !== -1 && matchIdx + 1 < args.length) {
      pattern = args[matchIdx + 1];
    }

    const now = Date.now();
    const allKeys = Array.from(this.store.keys()).filter(key => {
      const item = this.store.get(key);
      if (item && item.expiresAt && item.expiresAt < now) {
        this.store.delete(key);
        return false;
      }
      if (!pattern) return true;
      const regexStr = "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
      return new RegExp(regexStr).test(key);
    });

    return ["0", allKeys];
  }

  on() {
    return this;
  }
}

const globalForRedis = globalThis as unknown as {
  redis: Redis | any;
};

function createRedisClient() {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    lazyConnect: true,
  });

  const inMemory = new InMemoryRedis();
  let useInMemory = false;

  client.on("error", () => {
    if (!useInMemory) {
      console.warn("⚠️ Redis is not running locally. Falling back to an in-memory cache/rate-limiter.");
      useInMemory = true;
    }
  });

  // Create a proxy that forwards requests to real client unless it has failed
  return new Proxy(client, {
    get(target, prop) {
      if (useInMemory) {
        return (inMemory as any)[prop];
      }

      const val = (target as any)[prop];
      if (typeof val === "function") {
        return async (...args: any[]) => {
          try {
            // Attempt to connect if not connected
            if (target.status === "wait") {
              await target.connect().catch(() => {});
            }
            if (useInMemory || target.status === "end" || target.status === "close") {
              useInMemory = true;
              return (inMemory as any)[prop](...args);
            }
            return await val.apply(target, args);
          } catch {
            useInMemory = true;
            return (inMemory as any)[prop](...args);
          }
        };
      }
      return val;
    }
  }) as unknown as Redis;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
