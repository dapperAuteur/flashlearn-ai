import { AppConfig } from '@/models/AppConfig';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';
import { FLASHCARD_MAX as FLASHCARD_MAX_DEFAULT } from '@/lib/constants';

/**
 * Server-side readers for tunable AppConfig values (the keys managed from
 * Admin → Settings). Read fresh on each call so an admin change takes effect
 * immediately — these are low-frequency, single indexed lookups.
 */

/**
 * Upper bound on how many flashcards the AI generates per request (the "N" in the
 * default "5 to N" range). Falls back to the FLASHCARD_MAX constant when unset.
 */
export async function getFlashcardMax(): Promise<number> {
  try {
    await dbConnect();
    const doc = await AppConfig.findOne({ key: 'FLASHCARD_MAX' });
    if (doc && typeof doc.value === 'number' && Number.isFinite(doc.value) && doc.value > 0) {
      return Math.floor(doc.value);
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to read FLASHCARD_MAX; using default.', { error });
  }
  return FLASHCARD_MAX_DEFAULT;
}
