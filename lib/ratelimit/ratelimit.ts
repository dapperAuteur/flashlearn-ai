import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Logger, LogContext } from "@/lib/logging/logger";

// Support both legacy UPSTASH_* and new Vercel Marketplace STORAGE_KV_* naming
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.STORAGE_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.STORAGE_KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  const errorMessage = "Missing Upstash Redis environment variables for rate limiting.";
  Logger.error(LogContext.SYSTEM, errorMessage);
  throw new Error(errorMessage);
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

/**
 * Creates and returns a configured rate limiter instance.
 *
 * @param identifier - A unique string to identify the rate limit bucket (e.g., 'login', 'register').
 * @param requests - The number of requests allowed within the given duration.
 * @param duration - The time window in seconds.
 * @returns A configured instance of the Ratelimit class.
 */
export const getRateLimiter = (identifier: string, requests: number, duration: number) => {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${duration} s`),
    prefix: `ratelimit:${identifier}`,
  });
};
