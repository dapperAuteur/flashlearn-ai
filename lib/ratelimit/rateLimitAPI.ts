import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Logger, LogContext } from "@/lib/logging/logger";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/utils/utils";

let redis: Redis | undefined;
const ratelimits: Record<string, Ratelimit> = {};

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    Logger.info(LogContext.SYSTEM, "Upstash Redis initialized for API rate limiting.");
  } catch (error) {
    Logger.error(LogContext.SYSTEM, "Failed to initialize Upstash Redis.", { error });
  }
} else {
  Logger.warning(LogContext.SYSTEM, "Redis credentials not found. Using in-memory rate limiting (NOT FOR PRODUCTION).");
}

/**
 * A simple in-memory rate limiter for development environments where Redis is not available.
 * This class mimics the necessary parts of the Upstash Ratelimit interface.
 */
class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; reset: number }>();
  // FIX: Renamed property to avoid conflict with the 'limit' method name.
  private limitCount: number;
  private windowSeconds: number;

  constructor(limit: number, window: number) {
    this.limitCount = limit;
    this.windowSeconds = window;
  }

  async limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;
    const record = this.requests.get(identifier);

    if (!record || now > record.reset) {
      this.requests.set(identifier, { count: 1, reset: now + windowMs });
      return { success: true, limit: this.limitCount, remaining: this.limitCount - 1, reset: now + windowMs };
    }

    record.count++;
    const success = record.count <= this.limitCount;
    const remaining = Math.max(0, this.limitCount - record.count);
    return { success, limit: this.limitCount, remaining, reset: record.reset };
  }
}

export function getRateLimiter(identifier: string, limit: number, window: number): Ratelimit {
  if (ratelimits[identifier]) {
    return ratelimits[identifier];
  }
  if (redis) {
    ratelimits[identifier] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${window} s`),
      analytics: true,
      prefix: `ratelimit:${identifier}`
    });
  } else {
    ratelimits[identifier] = new InMemoryRateLimiter(limit, window) as unknown as Ratelimit;
  }
  Logger.info(LogContext.SYSTEM, `Rate limiter created: ${identifier}`, { limit, window, redis: !!redis });
  return ratelimits[identifier];
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  identifier: string,
  limit: number,
  window: number
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request) ?? '127.0.0.1';
    const limiter = getRateLimiter(identifier, limit, window);
    
    const { success, limit: returnedLimit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      Logger.warning(LogContext.SYSTEM, `Rate limit exceeded for ${identifier}`, { ip });
      const resetDate = new Date(reset).toUTCString();
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Ratelimit-Limit': returnedLimit.toString(),
          'X-Ratelimit-Remaining': remaining.toString(),
          'X-Ratelimit-Reset': resetDate,
        },
      });
    }

    return handler(request);
  };
}
