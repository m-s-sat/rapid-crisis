import { Redis } from "ioredis";
import { env } from "../config/env.js";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

export default redis;

/**
 * Fail-secure wrapper for Redis operations.
 * If Redis is unreachable, this will throw an error to be handled by the controller (returning 503/500).
 */
export const redisOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (redis.status !== "ready" && redis.status !== "connecting") {
    throw new Error("Redis is unreachable");
  }
  return await operation();
};
