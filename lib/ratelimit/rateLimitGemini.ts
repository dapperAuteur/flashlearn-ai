import { User } from "@/models/User";
import { AppConfig } from "@/models/AppConfig";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AppError } from "@/lib/errors/AppError";

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
    'Lifetime Learner': 2,
    Free: 1,
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
    const user = await User.findById(userId).select('role subscriptionTier aiGenerationCount lastAiGenerationDate');

    if (!user) {
        throw new AppError(`User not found during rate limit check`, 500);
    }

    const limits = await getRateLimitConfig();

    // Admins have unlimited access.
    if (user.role === 'Admin') {
        Logger.debug(LogContext.AI, `Admin user granted unlimited access.`, { userId });
        return { limited: false };
    }

    const limit = limits[user.subscriptionTier as keyof typeof limits] ?? limits.Free;
    const { aiGenerationCount, lastAiGenerationDate } = user;

    if (lastAiGenerationDate) {
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - AI_GENERATION_WINDOW_DAYS);

        // If the last generation was within the current window, check the count.
        if (lastAiGenerationDate > windowStart) {
            if (aiGenerationCount >= limit) {
                const reason = `User has reached their AI generation limit of ${limit} per ${AI_GENERATION_WINDOW_DAYS} days for the ${user.subscriptionTier} tier.`;
                Logger.warning(LogContext.AI, reason, { userId, tier: user.subscriptionTier, limit, count: aiGenerationCount });
                return { limited: true, reason };
            }
        } else {
            // NOTE: This is a write operation within a "check" function.
            // It resets the user's count if their last generation was outside the window.
            // This is an optimization to reset the count upon the user's next action
            // without needing a separate cron job.
            user.aiGenerationCount = 0;
            await user.save();
            Logger.info(LogContext.AI, `Reset AI generation count for user.`, { userId });
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
        await User.findByIdAndUpdate(userId, {
            $inc: { aiGenerationCount: 1 },
            $set: { lastAiGenerationDate: new Date() },
        });
        Logger.info(LogContext.AI, `Incremented AI generation count for user.`, { userId });
    } catch (error) {
        // This is a critical error as it could lead to incorrect billing or limits.
        Logger.error(LogContext.AI, `Failed to increment AI generation count for user.`, { userId, error });
        // Optionally, re-throw or handle this critical failure.
    }
}
