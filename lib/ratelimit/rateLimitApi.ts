import { getRateLimiter } from './ratelimit';
import { ApiUsage } from '@/models/ApiUsage';
import { ApiKey } from '@/models/ApiKey';
import { AppConfig } from '@/models/AppConfig';
import { Logger, LogContext } from '@/lib/logging/logger';
import { type ApiKeyType, type ApiTier, type ApiRateLimitConfig, DEFAULT_RATE_LIMITS } from '@/types/api';
import { checkAndDispatchWebhooks } from '@/lib/api/webhookDispatcher';
import { reportOverageToStripe } from '@/lib/api/reportOverageToStripe';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// In-memory cache for API rate limit config from AppConfig
let apiRateLimitConfigCache: Record<string, ApiRateLimitConfig> | null = null;

/**
 * Fetches API-specific rate limit overrides from the AppConfig collection.
 * Falls back to DEFAULT_RATE_LIMITS from types/api.d.ts if not configured.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getApiRateLimitConfig(): Promise<Record<string, ApiRateLimitConfig> | null> {
  if (apiRateLimitConfigCache) return apiRateLimitConfigCache;

  try {
    const configDoc = await AppConfig.findOne({ key: 'API_RATE_LIMITS' });
    if (configDoc && typeof configDoc.value === 'object' && configDoc.value !== null) {
      apiRateLimitConfigCache = configDoc.value as Record<string, ApiRateLimitConfig>;
      return apiRateLimitConfigCache;
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to fetch API_RATE_LIMITS from database.', { error });
  }

  return null;
}

/**
 * Clears the in-memory API rate limit cache.
 * Call this from the admin config update endpoint.
 */
export function clearApiRateLimitCache(): void {
  apiRateLimitConfigCache = null;
  Logger.info(LogContext.SYSTEM, 'API rate limit cache cleared.');
}

/**
 * Resolves the effective rate limits for a given key, considering:
 * 1. Custom per-key overrides (from ApiKey.customRateLimits)
 * 2. Admin-configured overrides (from AppConfig API_RATE_LIMITS)
 * 3. Default limits (from DEFAULT_RATE_LIMITS)
 */
export function getEffectiveRateLimits(
  keyType: ApiKeyType,
  apiTier: ApiTier,
  customRateLimits?: { burstPerMinute?: number; monthlyGenerations?: number; monthlyApiCalls?: number }
): ApiRateLimitConfig {
  const defaults = DEFAULT_RATE_LIMITS[keyType][apiTier];

  // Per-key custom limits take highest priority
  if (customRateLimits) {
    return {
      burstPerMinute: customRateLimits.burstPerMinute ?? defaults.burstPerMinute,
      monthlyGenerations: customRateLimits.monthlyGenerations ?? defaults.monthlyGenerations,
      monthlyApiCalls: customRateLimits.monthlyApiCalls ?? defaults.monthlyApiCalls,
    };
  }

  return { ...defaults };
}

/**
 * Checks burst (per-minute) rate limit for an API key.
 * Returns { allowed: true } or { allowed: false, reset } with the reset timestamp.
 */
export async function checkBurstLimit(
  apiKeyId: string,
  keyType: ApiKeyType,
  apiTier: ApiTier,
  customRateLimits?: { burstPerMinute?: number; monthlyGenerations?: number; monthlyApiCalls?: number }
): Promise<{ allowed: boolean; limit: number; remaining: number; reset: number }> {
  const limits = getEffectiveRateLimits(keyType, apiTier, customRateLimits);

  // Unlimited burst = always allow
  if (!isFinite(limits.burstPerMinute)) {
    return { allowed: true, limit: limits.burstPerMinute, remaining: Infinity, reset: 0 };
  }

  const limiter = getRateLimiter(`api:${apiKeyId}`, limits.burstPerMinute, 60);
  const result = await limiter.limit(apiKeyId);

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Gets the start/end of the current billing month (1st to 1st).
 */
export function getCurrentPeriod(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

/**
 * Gets or creates the usage record for a key in the current billing period.
 * Uses Redis cache to avoid hitting MongoDB on every request.
 */
export async function getMonthlyUsage(
  apiKeyId: string,
  userId: string,
  keyType: ApiKeyType
): Promise<{ apiCalls: number; generationCalls: number }> {
  const { periodStart, periodEnd } = getCurrentPeriod();
  const cacheKey = `api_usage:${apiKeyId}:${periodStart.toISOString().slice(0, 7)}`;

  // Try Redis cache first (60s TTL)
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return { apiCalls: parsed.apiCalls || 0, generationCalls: parsed.generationCalls || 0 };
    }
  } catch {
    // Cache miss or error, fall through to DB
  }

  // Query MongoDB
  const usage = await ApiUsage.findOneAndUpdate(
    { apiKeyId, periodStart },
    {
      $setOnInsert: {
        userId,
        keyType,
        periodStart,
        periodEnd,
        apiCalls: 0,
        generationCalls: 0,
        overageCalls: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const result = {
    apiCalls: usage.apiCalls,
    generationCalls: usage.generationCalls,
  };

  // Cache in Redis for 60s
  try {
    await redis.set(cacheKey, JSON.stringify(result), { ex: 60 });
  } catch {
    // Non-critical, continue
  }

  return result;
}

/**
 * Checks monthly quota for an API key. Returns whether the call is allowed.
 * - Admin/admin_public keys: always allowed
 * - Free tier: hard cap (blocked when exceeded)
 * - Developer/Pro tiers: soft cap (allowed with overage flag when exceeded)
 * - Enterprise: unlimited
 */
export async function checkMonthlyQuota(
  apiKeyId: string,
  userId: string,
  keyType: ApiKeyType,
  apiTier: ApiTier,
  isGenerationCall: boolean,
  customRateLimits?: { burstPerMinute?: number; monthlyGenerations?: number; monthlyApiCalls?: number }
): Promise<{ allowed: boolean; overage?: boolean; reason?: string }> {
  // Admin and admin_public keys bypass quotas
  if (keyType === 'admin' || keyType === 'admin_public') {
    return { allowed: true };
  }

  const limits = getEffectiveRateLimits(keyType, apiTier, customRateLimits);
  const usage = await getMonthlyUsage(apiKeyId, userId, keyType);

  // Paid tiers (Developer, Pro) get soft caps — overage allowed but billed
  const isPaidTier = apiTier === 'Developer' || apiTier === 'Pro';

  // Check total API calls quota
  if (isFinite(limits.monthlyApiCalls) && usage.apiCalls >= limits.monthlyApiCalls) {
    if (isPaidTier) {
      return { allowed: true, overage: true };
    }
    return {
      allowed: false,
      reason: `Monthly API call limit of ${limits.monthlyApiCalls} reached.`,
    };
  }

  // Check generation-specific quota
  if (isGenerationCall && isFinite(limits.monthlyGenerations) && usage.generationCalls >= limits.monthlyGenerations) {
    if (isPaidTier) {
      return { allowed: true, overage: true };
    }
    return {
      allowed: false,
      reason: `Monthly generation limit of ${limits.monthlyGenerations} reached.`,
    };
  }

  return { allowed: true };
}

/**
 * Increments usage counters after a successful API call.
 * If overage, also increments overageCalls and reports to Stripe.
 * Checks for webhook milestones and dispatches notifications.
 */
export async function incrementUsage(
  apiKeyId: string,
  userId: string,
  keyType: ApiKeyType,
  isGenerationCall: boolean,
  isOverage: boolean = false,
  apiTier?: ApiTier
): Promise<void> {
  const { periodStart, periodEnd } = getCurrentPeriod();
  const cacheKey = `api_usage:${apiKeyId}:${periodStart.toISOString().slice(0, 7)}`;

  const update: Record<string, number> = { apiCalls: 1 };
  if (isGenerationCall) {
    update.generationCalls = 1;
  }
  if (isOverage) {
    update.overageCalls = 1;
  }

  try {
    const updatedUsage = await ApiUsage.findOneAndUpdate(
      { apiKeyId, periodStart },
      {
        $inc: update,
        $setOnInsert: {
          userId,
          keyType,
          periodEnd,
        },
      },
      { upsert: true, new: true }
    );

    // Invalidate Redis cache
    await redis.del(cacheKey);

    // Report overage to Stripe (fire-and-forget)
    if (isOverage && apiTier && isGenerationCall) {
      reportOverageToStripe(userId, apiTier, 1).catch(() => {});
    }

    // Check for webhook milestones (fire-and-forget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const key: any = await ApiKey.findById(apiKeyId)
      .select('webhookUrl keyPrefix apiTier customRateLimits')
      .lean();

    if (key?.webhookUrl) {
      const limits = getEffectiveRateLimits(keyType, key.apiTier, key.customRateLimits);
      checkAndDispatchWebhooks(
        apiKeyId,
        key.keyPrefix,
        keyType,
        key.apiTier,
        key.webhookUrl,
        { apiCalls: updatedUsage.apiCalls, generationCalls: updatedUsage.generationCalls },
        limits
      ).catch(() => {});
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to increment API usage.', {
      apiKeyId, keyType, error,
    });
  }
}
