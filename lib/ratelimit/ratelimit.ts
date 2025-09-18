import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Logger, LogContext } from "@/lib/logging/logger";

// Ensure environment variables are loaded
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  const errorMessage = "Missing Upstash Redis environment variables for rate limiting.";
  // Log the error on the server
  Logger.error(LogContext.SYSTEM, errorMessage);
  // Throwing an error is appropriate here because rate limiting is a critical security feature.
  // The application should not run without it.
  throw new Error(errorMessage);
}

// Create a new Redis client instance.
// The `cache` variable is used to hold a singleton instance of the Redis client.
// This prevents creating a new connection for every server request, which is inefficient.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
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
