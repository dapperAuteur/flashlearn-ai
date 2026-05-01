import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Edge-safe rate limiter for recon-probe traffic. Imported by middleware,
// so cannot pull in node-only logger code. Module-level init runs once
// per cold start; subsequent requests reuse the limiter instance.

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;

let limiter: Ratelimit | null = null;

if (redisUrl && redisToken) {
  limiter = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(50, '5 m'),
    prefix: 'ratelimit:recon-probe',
    analytics: false,
  });
}

export interface ReconProbeRateLimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
}

// Returns { limited: false } when there's no Redis configured (so the recon
// probe still gets its 404), or when this IP is under the cap. Returns
// { limited: true, retryAfterSeconds } when the IP has exceeded the cap.
export async function checkReconProbeRateLimit(ip: string): Promise<ReconProbeRateLimitResult> {
  if (!limiter || !ip) {
    return { limited: false };
  }
  try {
    const { success, reset } = await limiter.limit(ip);
    if (success) return { limited: false };
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { limited: true, retryAfterSeconds };
  } catch {
    // If Redis is down, fail open: let the request through to the 404 path.
    // Recon probes still get a 404; we just lose the rate-limiting protection.
    return { limited: false };
  }
}
