import { User } from "@/models/User";
import { Logger, LogContext } from "@/lib/logging/logger";

// Define the rate limiting window in days
const AI_GENERATION_WINDOW_DAYS = 30;

// Define the generation limits for each user role and subscription tier.
// This makes it easy to manage and update limits in one place.
const RATE_LIMITS = {
  Admin: Infinity, // Admins have no limit.
  'Lifetime Learner': 2,
  Free: 1,
};

/**
 * Checks if a user has exceeded their AI generation limit based on their role and subscription tier.
 *
 * @param userId - The ID of the user to check.
 * @returns An object indicating if the user is rate-limited and the reason.
 */
export async function checkRateLimit(userId: string): Promise<{ limited: boolean; reason?: string }> {
    // Fetch only the necessary fields from the User document for efficiency.
    const user = await User.findById(userId).select('role subscriptionTier aiGenerationCount lastAiGenerationDate');

    if (!user) {
        // This case should ideally not be reached for an authenticated user.
        Logger.error(LogContext.AI, `User not found during rate limit check for userId: ${userId}`, { userId });
        return { limited: true, reason: "User not found." };
    }

    // Admins have unlimited access and bypass all checks.
    if (user.role === 'Admin') {
        Logger.debug(LogContext.AI, `Admin user ${userId} granted unlimited access.`, { userId });
        return { limited: false };
    }

    // Determine the user's specific limit based on their subscription tier, defaulting to 'Free'.
    const limit = RATE_LIMITS[user.subscriptionTier as keyof typeof RATE_LIMITS] ?? RATE_LIMITS.Free;

    const { aiGenerationCount, lastAiGenerationDate } = user;

    if (lastAiGenerationDate) {
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - AI_GENERATION_WINDOW_DAYS);

        // Check if the last generation was within the current 30-day window.
        if (lastAiGenerationDate > windowStart) {
            // If they are at or over their limit for the current window.
            if (aiGenerationCount >= limit) {
                const message = `User ${userId} has reached their AI generation limit of ${limit} per ${AI_GENERATION_WINDOW_DAYS} days for the ${user.subscriptionTier} tier.`;
                Logger.warning(LogContext.AI, message, { userId, tier: user.subscriptionTier, limit });
                return { limited: true, reason: message };
            }
        } else {
            // It's a new window, so reset their generation count.
            Logger.info(LogContext.AI, `Resetting AI generation count for user ${userId} as a new window has started.`, { userId });
            user.aiGenerationCount = 0;
            await user.save();
        }
    }

    // If none of the limiting conditions were met, the user is not limited.
    return { limited: false };
}

/**
 * Increments the AI generation count for a user.
 *
 * @param userId - The ID of the user to update.
 */
export async function incrementGenerationCount(userId: string): Promise<void> {
    try {
        await User.findByIdAndUpdate(userId, {
            $inc: { aiGenerationCount: 1 },
            $set: { lastAiGenerationDate: new Date() },
        });
        Logger.info(LogContext.AI, `Incremented AI generation count for user ${userId}.`, { userId });
    } catch (error) {
        Logger.error(LogContext.AI, `Failed to increment AI generation count for user ${userId}.`, { userId, error });
    }
}
