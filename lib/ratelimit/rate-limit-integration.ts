import { checkRateLimit } from '@/lib/ratelimit/rateLimitGemini';

/**
 * Check if user can generate AI content (integrates with existing rateLimitGemini.ts)
 */
export async function checkAIGenerationLimit(userId: string): Promise<boolean> {
  try {
    const result = await checkRateLimit(userId);
    return !result.limited;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false; // Fail closed
  }
}

/**
 * Get rate limit status for UI display
 */
export async function getAILimitStatus(userId: string): Promise<{ allowed: boolean; message: string }> {
  try {
    const result = await checkRateLimit(userId);
    return {
      allowed: !result.limited,
      message: result.limited ? result.reason || 'Rate limit exceeded' : 'Rate limit OK'
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return {
      allowed: false,
      message: 'Failed to check rate limit'
    };
  }
}