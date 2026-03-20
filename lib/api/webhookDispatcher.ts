import { Logger, LogContext } from '@/lib/logging/logger';
import { Redis } from '@upstash/redis';
import { type ApiKeyType, type ApiTier, type ApiRateLimitConfig } from '@/types/api';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type WebhookEvent =
  | 'usage_50_percent'
  | 'usage_75_percent'
  | 'usage_90_percent'
  | 'quota_exceeded';

interface WebhookPayload {
  event: WebhookEvent;
  apiKeyId: string;
  keyPrefix: string;
  keyType: ApiKeyType;
  apiTier: ApiTier;
  usage: { apiCalls: number; generationCalls: number };
  limits: { monthlyApiCalls: number; monthlyGenerations: number };
  timestamp: string;
}

const MILESTONES: { threshold: number; event: WebhookEvent }[] = [
  { threshold: 0.50, event: 'usage_50_percent' },
  { threshold: 0.75, event: 'usage_75_percent' },
  { threshold: 0.90, event: 'usage_90_percent' },
  { threshold: 1.00, event: 'quota_exceeded' },
];

/**
 * Determines which milestone events should be fired based on current usage.
 * Returns only milestones that were just crossed (not previously notified).
 */
export async function getNewMilestones(
  apiKeyId: string,
  period: string,
  usage: { apiCalls: number; generationCalls: number },
  limits: ApiRateLimitConfig
): Promise<WebhookEvent[]> {
  const newEvents: WebhookEvent[] = [];

  for (const milestone of MILESTONES) {
    // Check API calls ratio
    const apiCallRatio = isFinite(limits.monthlyApiCalls) && limits.monthlyApiCalls > 0
      ? usage.apiCalls / limits.monthlyApiCalls
      : 0;
    // Check generation calls ratio
    const genRatio = isFinite(limits.monthlyGenerations) && limits.monthlyGenerations > 0
      ? usage.generationCalls / limits.monthlyGenerations
      : 0;

    const maxRatio = Math.max(apiCallRatio, genRatio);

    if (maxRatio >= milestone.threshold) {
      // Check if already notified for this milestone this period
      const notifiedKey = `webhook_notified:${apiKeyId}:${period}:${milestone.event}`;
      try {
        const alreadyNotified = await redis.get(notifiedKey);
        if (!alreadyNotified) {
          newEvents.push(milestone.event);
          // Mark as notified (TTL = 35 days to cover the billing period)
          await redis.set(notifiedKey, '1', { ex: 35 * 24 * 60 * 60 });
        }
      } catch {
        // Redis error, skip this milestone to avoid duplicates
      }
    }
  }

  return newEvents;
}

/**
 * Sends a webhook POST request to the given URL.
 * Retries once after 5 seconds on failure.
 */
export async function sendWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  retry = true
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FlashLearn-Webhooks/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    Logger.info(LogContext.SYSTEM, `Webhook delivered: ${payload.event}`, {
      metadata: { apiKeyId: payload.apiKeyId, webhookUrl, statusCode: response.status },
    });
  } catch (error) {
    Logger.warning(LogContext.SYSTEM, `Webhook delivery failed${retry ? ', will retry' : ''}`, {
      metadata: { apiKeyId: payload.apiKeyId, webhookUrl, event: payload.event, error },
    });

    if (retry) {
      // Retry once after 5 seconds
      setTimeout(() => {
        sendWebhook(webhookUrl, payload, false).catch(() => {});
      }, 5000);
    }
  }
}

/**
 * Checks for usage milestones and dispatches webhooks if the API key has a webhookUrl.
 * Called fire-and-forget from incrementUsage().
 */
export async function checkAndDispatchWebhooks(
  apiKeyId: string,
  keyPrefix: string,
  keyType: ApiKeyType,
  apiTier: ApiTier,
  webhookUrl: string,
  usage: { apiCalls: number; generationCalls: number },
  limits: ApiRateLimitConfig
): Promise<void> {
  const period = new Date().toISOString().slice(0, 7); // "2026-03"

  const newEvents = await getNewMilestones(apiKeyId, period, usage, limits);

  for (const event of newEvents) {
    const payload: WebhookPayload = {
      event,
      apiKeyId,
      keyPrefix,
      keyType,
      apiTier,
      usage,
      limits: {
        monthlyApiCalls: isFinite(limits.monthlyApiCalls) ? limits.monthlyApiCalls : -1,
        monthlyGenerations: isFinite(limits.monthlyGenerations) ? limits.monthlyGenerations : -1,
      },
      timestamp: new Date().toISOString(),
    };

    // Fire-and-forget
    sendWebhook(webhookUrl, payload).catch(() => {});
  }
}
