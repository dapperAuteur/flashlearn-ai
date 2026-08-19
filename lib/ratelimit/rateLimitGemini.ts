import { User } from "@/models/User";
import { AppConfig } from "@/models/AppConfig";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AppError } from "@/lib/errors/AppError";
import { getActivePromotion } from "@/lib/promo/promotions";

const AI_GENERATION_WINDOW_DAYS = 30;

// In-memory cache for the rate limit configuration to optimize performance.
let rateLimitConfig: Record<string, number> | null = null;

/**
 * Fetches rate limit settings from the 'appconfigs' collection in the database.
 * Caches the result in memory to prevent repeated database queries.
 * @returns {Promise<Record<string, number>>} The rate limit configuration object.
 */
async function getRateLimitConfig(): Promise<Record<string, number>> {
  if (rateLimitConfig) {
    Logger.debug(LogContext.SYSTEM, "Using cached RATE_LIMITS.");
    return rateLimitConfig;
  }

  try {
    const configDoc = await AppConfig.findOne({ key: 'RATE_LIMITS' });
    // Ensure the value is a non-null object before caching.
    if (configDoc && typeof configDoc.value === 'object' && configDoc.value !== null) {
      Logger.info(LogContext.SYSTEM, "Fetched and cached RATE_LIMITS from database.");
      rateLimitConfig = configDoc.value as Record<string, number>;
      return rateLimitConfig;
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, "Failed to fetch RATE_LIMITS from database. Using fallback.", { error });
  }

  // Fallback to default values if the database fetch fails or the entry is invalid.
  Logger.warning(LogContext.SYSTEM, "RATE_LIMITS not found in DB or invalid. Using default fallback values.");
  return {
    Admin: Infinity,
    'Lifetime Learner': 10,
    'Annual Pro': 10,
    'Monthly Pro': 5,
    Free: 3,
  };
}

/**
 * Clears the in-memory rate limit configuration cache.
 * This should be called by the admin API endpoint after updating the settings in the database.
 */
export function clearRateLimitCache(): void {
  rateLimitConfig = null;
  Logger.info(LogContext.SYSTEM, "In-memory RATE_LIMITS cache cleared.");
}

/**
 * Checks if a user has exceeded their AI generation limit.
 * @param {string} userId - The ID of the user to check.
 * @returns {Promise<{ limited: boolean; reason?: string }>} An object indicating if the user is rate-limited.
 * @throws {AppError} if the user is not found.
 */
export async function checkRateLimit(userId: string): Promise<{ limited: boolean; reason?: string }> {
    const user = await User.findById(userId).select('role subscriptionTier aiGenerationCount lastAiGenerationDate aiGenerationWindowStart');

    if (!user) {
        throw new AppError(`User not found during rate limit check`, 500);
    }

    const limits = await getRateLimitConfig();

    // Admins have unlimited access.
    if (user.role === 'Admin') {
        Logger.debug(LogContext.AI, `Admin user granted unlimited access.`, { userId });
        return { limited: false };
    }

    const tierLimit = limits[user.subscriptionTier as keyof typeof limits] ?? limits.Free;
    const promo = await getActivePromotion();
    const effectiveLimit = promo ? Math.max(tierLimit, promo.flatLimit) : tierLimit;
    const { aiGenerationCount, lastAiGenerationDate, aiGenerationWindowStart } = user;

    // The allowance is N per 30-DAY PERIOD, measured from when the period
    // started. It used to be measured from the last generation, which meant the
    // count reset only after 30 days of complete inactivity. Anyone who
    // generated even once a month never reset: their count climbed one at a
    // time until it reached the cap and stayed there, on a tier they were
    // nowhere near using up. The promo made that visible, but it was never
    // promo-specific.
    //
    // Accounts predating aiGenerationWindowStart fall back to
    // lastAiGenerationDate, which is the closest thing to a period start we can
    // infer, and is never later than the real one, so nobody is over-restricted
    // by the migration.
    const periodStart = aiGenerationWindowStart ?? lastAiGenerationDate;

    if (periodStart) {
        const periodExpiresAt = new Date(periodStart);
        periodExpiresAt.setDate(periodExpiresAt.getDate() + AI_GENERATION_WINDOW_DAYS);

        if (periodExpiresAt > new Date()) {
            if (aiGenerationCount >= effectiveLimit) {
                const reason = `User has reached their AI generation limit of ${effectiveLimit} per ${AI_GENERATION_WINDOW_DAYS} days for the ${user.subscriptionTier} tier.`;
                Logger.warning(LogContext.AI, reason, { userId, tier: user.subscriptionTier, tierLimit, effectiveLimit, promoActive: !!promo, promoSlug: promo?.slug, count: aiGenerationCount });
                return { limited: true, reason };
            }
        } else {
            // The period has run out. Start a fresh one now rather than waiting
            // for a cron, which is why a check function writes here.
            user.aiGenerationCount = 0;
            user.aiGenerationWindowStart = new Date();
            await user.save();
            Logger.info(LogContext.AI, `Started a new AI generation period for user.`, { userId });
        }
    }

    return { limited: false };
}

/**
 * Increments the AI generation count for a user after a successful generation.
 * @param {string} userId - The ID of the user to update.
 */
export async function incrementGenerationCount(userId: string): Promise<void> {
    try {
        const now = new Date();
        // An aggregation-pipeline update so the period start is established on
        // the first generation and never moved afterwards, atomically. A plain
        // $set would slide the period forward on every generation, which is the
        // bug this replaced.
        await User.findByIdAndUpdate(userId, [
            {
                $set: {
                    aiGenerationCount: { $add: [{ $ifNull: ['$aiGenerationCount', 0] }, 1] },
                    lastAiGenerationDate: now,
                    aiGenerationWindowStart: { $ifNull: ['$aiGenerationWindowStart', now] },
                },
            },
        ]);
        Logger.info(LogContext.AI, `Incremented AI generation count for user.`, { userId });
    } catch (error) {
        // This is a critical error as it could lead to incorrect billing or limits.
        Logger.error(LogContext.AI, `Failed to increment AI generation count for user.`, { userId, error });
        // Optionally, re-throw or handle this critical failure.
    }
}
