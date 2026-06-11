/**
 * Feature flags.
 *
 * Simple `*_ENABLED` env-var toggles, matching the existing precedent
 * (HOMEPAGE_AB_TEST_ENABLED, OUTBOX_TRIGGER_ENABLED). Flip in Vercel + redeploy.
 */

/**
 * Audio flashcard generation. Off by default — shown as "coming soon" to everyone
 * except admins (admins always have access for testing). Turn on for all users by
 * setting NEXT_PUBLIC_AUDIO_GENERATION_ENABLED=true.
 *
 * Uses the NEXT_PUBLIC_ prefix so the same flag is readable from both the API route
 * (server) and the generate page (client) — one source of truth.
 */
export function isAudioGenerationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUDIO_GENERATION_ENABLED === 'true';
}
