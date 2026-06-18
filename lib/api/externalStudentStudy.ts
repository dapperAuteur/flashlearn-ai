import { Types } from 'mongoose';
import { replaySm2 } from '@/lib/algorithms/sm2';
import { ExternalStudyResult } from '@/models/ExternalStudyResult';
import { ExternalStudentCardState } from '@/models/ExternalStudentCardState';

export interface ResolvedResult {
  cardId: Types.ObjectId;
  cardExternalId: string;
  isCorrect: boolean;
  confidenceRating?: number;
  source?: string;
  occurredAt: Date;
}

export interface IngestArgs {
  apiKeyId: Types.ObjectId;
  externalStudentId: string;
  setId: Types.ObjectId;
  results: ResolvedResult[];
}

export interface IngestSummary {
  applied: number;
  duplicates: number;
}

/**
 * Persist a batch of resolved external results and recompute the affected cards'
 * SM-2 state. Each result is appended to the ledger under a unique
 * (apiKeyId, externalStudentId, cardExternalId, occurredAt) key; retries hit the
 * duplicate key and are skipped. For every card a new result touched, replay the
 * full ledger for that card and upsert the projection, so the stored state always
 * equals "all results applied in order" no matter how many times a push repeats.
 */
export async function ingestExternalResults(args: IngestArgs): Promise<IngestSummary> {
  const { apiKeyId, externalStudentId, setId, results } = args;

  let applied = 0;
  let duplicates = 0;
  const touchedCardIds = new Map<string, Types.ObjectId>();

  for (const r of results) {
    try {
      await ExternalStudyResult.create({
        apiKeyId,
        externalStudentId,
        setId,
        cardId: r.cardId,
        cardExternalId: r.cardExternalId,
        isCorrect: r.isCorrect,
        confidenceRating: r.confidenceRating,
        source: r.source,
        occurredAt: r.occurredAt,
      });
      applied += 1;
      touchedCardIds.set(r.cardId.toString(), r.cardId);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        duplicates += 1;
        continue;
      }
      throw err;
    }
  }

  for (const cardId of touchedCardIds.values()) {
    const ledger = await ExternalStudyResult.find({
      apiKeyId,
      externalStudentId,
      setId,
      cardId,
    })
      .sort({ occurredAt: 1 })
      .select('isCorrect confidenceRating occurredAt cardExternalId')
      .lean<{ isCorrect: boolean; confidenceRating?: number; occurredAt: Date; cardExternalId: string }[]>();

    const projection = replaySm2(ledger);
    const cardExternalId = ledger[ledger.length - 1]?.cardExternalId;

    await ExternalStudentCardState.updateOne(
      { apiKeyId, externalStudentId, setId, cardId },
      {
        $set: {
          cardExternalId,
          easinessFactor: projection.easinessFactor,
          interval: projection.interval,
          repetitions: projection.repetitions,
          nextReviewDate: projection.nextReviewDate,
          correctCount: projection.correctCount,
          incorrectCount: projection.incorrectCount,
          lastResultAt: projection.lastResultAt,
        },
      },
      { upsert: true },
    );
  }

  return { applied, duplicates };
}
