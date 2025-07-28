import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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
  console.log("Redis initialized for rate limiting");
} else {
  console.log("Redis credentials not found, using in-memory rate limiting (not for production)");
}

// Map to store in-memory rate limiting data (only for development)
const inMemoryMap = new Map<string, { count: number, reset: number }>();

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
    // Create a simple in-memory rate limiter for development
    ratelimits[identifier] = {
      limit: async (key: string) => {
        const now = Date.now();
        const resetTime = now + window * 1000;
        
        const keyData = inMemoryMap.get(key) || { count: 0, reset: resetTime };
        
        // Reset counter if window has passed
        if (now > keyData.reset) {
          keyData.count = 0;
          keyData.reset = resetTime;
        }
        
        // Increment count
        keyData.count += 1;
        inMemoryMap.set(key, keyData);
        
        const success = keyData.count <= limit;
        const remaining = Math.max(0, limit - keyData.count);
        const reset = Math.ceil((keyData.reset - now) / 1000);
        
        return {
          success,
          limit,
          remaining,
          reset,
        };
      }
    } as unknown as Ratelimit;
  }
  
  console.log(`Rate limiter created: ${identifier}, ${limit} requests per ${window} seconds`);
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