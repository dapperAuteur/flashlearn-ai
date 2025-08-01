import { User } from "@/models/User";
import { Logger, LogContext } from "@/lib/logging/logger";

const AI_GENERATION_LIMIT = 2;
const AI_GENERATION_WINDOW_DAYS = 30;

/**
 * Checks if a user has exceeded their AI generation limit.
 *
 * @param userId - The ID of the user to check.
 * @returns An object indicating if the user is rate-limited and the reason.
 */
export async function checkRateLimit(userId: string): Promise<{ limited: boolean; reason?: string }> {
    const user = await User.findById(userId);

    if (!user) {
        // Should not happen for authenticated users
        return { limited: true, reason: "User not found." };
    }
    
    // 'Lifetime Learner' tier has unlimited access
    if (user.subscriptionTier === 'Lifetime Learner') {
        return { limited: false };
    }

    const { aiGenerationCount, lastAiGenerationDate } = user;

    if (lastAiGenerationDate) {
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - AI_GENERATION_WINDOW_DAYS);

        if (lastAiGenerationDate > windowStart) {
            if (aiGenerationCount >= AI_GENERATION_LIMIT) {
                const message = `User ${userId} has reached the AI generation limit of ${AI_GENERATION_LIMIT} per ${AI_GENERATION_WINDOW_DAYS} days.`;
                Logger.warning(LogContext.AI, message, { userId });
                return { limited: true, reason: message };
            }
        } else {
            // It's a new window, reset the count
            user.aiGenerationCount = 0;
            await user.save();
        }
    }

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
