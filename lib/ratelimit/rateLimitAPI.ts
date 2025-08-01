import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Logger, LogContext } from "@/lib/logging/logger";

// Create a Redis instance using environment variables
// For development without Redis, we'll use a simpler in-memory version
let redis: Redis | undefined;
const ratelimits: Record<string, Ratelimit> = {};

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Use Upstash Redis if credentials are provided
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  Logger.info(LogContext.SYSTEM, "Redis initialized for rate limiting");
} else {
  Logger.warning(LogContext.SYSTEM, "Redis credentials not found, using in-memory rate limiting (not for production)");
}

/**
 * A simple in-memory rate limiter for development environments.
 * This class mimics the necessary parts of the Upstash Ratelimit interface.
 */
class InMemoryRateLimiter {
  private map = new Map<string, { count: number; reset: number }>();
  private limitCount: number;
  private windowSeconds: number;

  constructor(limit: number, window: number) {
    this.limitCount = limit;
    this.windowSeconds = window;
  }

  async limit(key: string) {
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;
    const resetTime = now + windowMs;

    const keyData = this.map.get(key) || { count: 0, reset: resetTime };

    if (now > keyData.reset) {
      keyData.count = 0;
      keyData.reset = resetTime;
    }

    keyData.count += 1;
    this.map.set(key, keyData);

    const success = keyData.count <= this.limitCount;
    const remaining = Math.max(0, this.limitCount - keyData.count);
    const reset = Math.ceil((keyData.reset - now) / 1000);

    return {
      success, limit: this.limitCount, remaining, reset,
    };
  }
}

/**
 * Create a rate limiter instance
 * @param identifier Unique identifier for this rate limiter
 * @param limit Number of requests allowed
 * @param window Time window in seconds
 */
export function getRateLimiter(identifier: string, limit: number, window: number) {
  // Return existing instance if already created
  if (ratelimits[identifier]) {
    return ratelimits[identifier];
  }

  if (redis) {
    // Create a Redis-backed rate limiter
    ratelimits[identifier] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${window} s`),
      analytics: true,
    });
  } else {
    // Use the type-safe in-memory rate limiter for development
    ratelimits[identifier] = new InMemoryRateLimiter(limit, window) as unknown as Ratelimit;
  }
  
  Logger.info(LogContext.SYSTEM, `Rate limiter created: ${identifier}`, {
    limit, window
  });
  return ratelimits[identifier];
}

/**
 * Rate limit middleware for Next.js API routes
 */
export async function rateLimitRequest(
  ip: string,
  identifier: string = "api",
  limit: number = 10,
  window: number = 60
) {
  const rateLimiter = getRateLimiter(identifier, limit, window);
  
  const key = `${identifier}:${ip}`;
  const { success, limit: rateLimit, remaining, reset } = await rateLimiter.limit(key);
  
  return {
    success,
    limit: rateLimit,
    remaining,
    reset,
  };
}