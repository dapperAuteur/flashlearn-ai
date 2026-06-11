import { AppConfig } from '@/models/AppConfig';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * Feature flags, stored in the `appconfigs` collection under the FEATURE_FLAGS key
 * so they can be toggled from the admin dashboard (Admin → Settings) with no
 * redeploy. Read fresh on each call (one indexed findOne) so a toggle propagates
 * instantly across all serverless instances — no in-memory cache to go stale.
 *
 * Server-only (touches Mongo). The client reads the public GET /api/features
 * endpoint instead of importing this module.
 */

export const FEATURE_FLAGS_KEY = 'FEATURE_FLAGS';

export interface FeatureFlags {
  /** Audio flashcard generation. Off = "coming soon" for non-admins (admins always allowed). */
  audioGeneration: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  audioGeneration: false,
};

/** Reads the FEATURE_FLAGS config, falling back to defaults if missing or on error. */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    await dbConnect();
    const doc = await AppConfig.findOne({ key: FEATURE_FLAGS_KEY });
    if (doc && typeof doc.value === 'object' && doc.value !== null) {
      const v = doc.value as Partial<FeatureFlags>;
      return { audioGeneration: Boolean(v.audioGeneration) };
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to read FEATURE_FLAGS; using defaults.', { error });
  }
  return { ...DEFAULT_FEATURE_FLAGS };
}

/** Whether audio flashcard generation is enabled for everyone (admins always have access). */
export async function isAudioGenerationEnabled(): Promise<boolean> {
  return (await getFeatureFlags()).audioGeneration;
}
