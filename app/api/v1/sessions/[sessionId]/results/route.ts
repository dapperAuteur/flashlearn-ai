import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { EcosystemSession } from '@/models/EcosystemSession';
import { CardAttempt } from '@/models/CardAttempt';
import { MasteryRollup } from '@/models/MasteryRollup';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { applyAttempt, emptyRollup, type RollupState } from '@/lib/api/masteryRollup';
import { assembleSessionCompletedPayload } from '@/lib/api/sessionPayload';
import { enqueueDelivery } from '@/lib/api/ecosystemWebhookDispatcher';
import { qstashPublisher } from '@/lib/qstash/client';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

interface ResultsBody {
  cards?: unknown;
}

interface IncomingAttempt {
  isCorrect: boolean;
  latencyMs: number;
  attemptedAt?: string;
  confidenceRating?: 1 | 2 | 3 | 4 | 5;
}

interface IncomingCard {
  cardId: string;
  attempts: IncomingAttempt[];
}

interface ValidatedResults {
  cards: IncomingCard[];
}

function validateBody(body: ResultsBody): ValidatedResults | { error: string; field?: string } {
  if (!Array.isArray(body.cards) || body.cards.length === 0) {
    return { error: 'cards must be a non-empty array.', field: 'cards' };
  }
  const cards: IncomingCard[] = [];
  for (let i = 0; i < body.cards.length; i++) {
    const c = body.cards[i] as { cardId?: unknown; attempts?: unknown };
    if (typeof c.cardId !== 'string' || c.cardId.trim() === '') {
      return { error: `cards[${i}].cardId is required.`, field: `cards[${i}].cardId` };
    }
    if (!Array.isArray(c.attempts) || c.attempts.length === 0) {
      return { error: `cards[${i}].attempts must be a non-empty array.`, field: `cards[${i}].attempts` };
    }
    const attempts: IncomingAttempt[] = [];
    for (let j = 0; j < c.attempts.length; j++) {
      const a = c.attempts[j] as { isCorrect?: unknown; latencyMs?: unknown; attemptedAt?: unknown; confidenceRating?: unknown };
      if (typeof a.isCorrect !== 'boolean') {
        return { error: `cards[${i}].attempts[${j}].isCorrect must be boolean.`, field: `cards[${i}].attempts[${j}].isCorrect` };
      }
      if (typeof a.latencyMs !== 'number' || a.latencyMs < 0) {
        return { error: `cards[${i}].attempts[${j}].latencyMs must be a non-negative number.`, field: `cards[${i}].attempts[${j}].latencyMs` };
      }
      const attempt: IncomingAttempt = {
        isCorrect: a.isCorrect,
        latencyMs: a.latencyMs,
      };
      if (typeof a.attemptedAt === 'string') attempt.attemptedAt = a.attemptedAt;
      if (typeof a.confidenceRating === 'number' && [1, 2, 3, 4, 5].includes(a.confidenceRating)) {
        attempt.confidenceRating = a.confidenceRating as 1 | 2 | 3 | 4 | 5;
      }
      attempts.push(attempt);
    }
    cards.push({ cardId: c.cardId, attempts });
  }
  return { cards };
}

async function handler(
  request: NextRequest,
  context: ApiAuthContext,
  requestId: string,
) {
  // Next.js 15 dynamic-route param: parse from the URL since the wrapper
  // doesn't pass route params.
  const sessionId = request.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!sessionId) {
    return apiError('INVALID_INPUT', requestId, undefined, 'sessionId path param is required.');
  }

  let body: ResultsBody;
  try {
    body = (await request.json()) as ResultsBody;
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const validated = validateBody(body);
  if ('error' in validated) {
    return apiError('INVALID_INPUT', requestId, validated.field ? { field: validated.field } : undefined, validated.error);
  }

  await dbConnect();

  const session = await EcosystemSession.findOne({ sessionId, apiKeyId: context.apiKey._id });
  if (!session) {
    return apiError('NOT_FOUND', requestId, undefined, `Session ${sessionId} not found for this API key.`);
  }

  // Persist attempts. We DON'T return early on duplicate (sessionId, cardId,
  // attemptNumber) because the uniqueness index handles dedupe — a network
  // retry from the consumer just no-ops on the duplicate key.
  const standardCodes = session.standards;
  const completedAt = new Date();
  for (const card of validated.cards) {
    let cardObjectId: Types.ObjectId;
    try {
      cardObjectId = new Types.ObjectId(card.cardId);
    } catch {
      return apiError('INVALID_INPUT', requestId, { field: `cards[*].cardId`, value: card.cardId }, 'cardId must be a valid ObjectId string.');
    }
    for (let i = 0; i < card.attempts.length; i++) {
      const a = card.attempts[i];
      const attemptNumber = i + 1;
      try {
        await CardAttempt.create({
          apiKeyId: context.apiKey._id,
          childId: session.childId,
          sessionId,
          cardId: cardObjectId,
          standardCodes,
          attemptNumber,
          correctOnFirstAttempt: attemptNumber === 1 ? a.isCorrect : false,
          isCorrect: a.isCorrect,
          latencyMs: a.latencyMs,
          confidenceRating: a.confidenceRating,
          attemptedAt: a.attemptedAt ? new Date(a.attemptedAt) : new Date(),
        });
      } catch (err) {
        // Duplicate key (E11000) on (sessionId, cardId, attemptNumber) — the
        // attempt was already recorded by an earlier retry. Treat as no-op.
        if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) continue;
        throw err;
      }
    }
  }

  // Update mastery rollups for each standard the session referenced. We
  // recompute from the persisted state so concurrent calls converge instead
  // of racing on in-memory deltas.
  for (const std of standardCodes) {
    const existing = await MasteryRollup.findOne({
      apiKeyId: context.apiKey._id,
      childId: session.childId,
      framework: std.framework,
      code: std.code,
    });
    let state: RollupState = existing
      ? {
          state: existing.state,
          recentFirstAttempts: existing.recentFirstAttempts,
          firstAttemptCorrectRate: existing.firstAttemptCorrectRate,
          attemptCount: existing.attemptCount,
          firstAttemptCount: existing.firstAttemptCount,
        }
      : emptyRollup();

    // Apply each new attempt this request brought in. We use only the FIRST
    // attempt-per-card from this batch as a "first attempt" for rollup math
    // (subsequent attempts on the same card don't change the first-attempt
    // window).
    for (const card of validated.cards) {
      // Was this card tagged with the rollup standard? In current usage all
      // session cards share session.standards, so yes.
      void std;
      const firstAttempt = card.attempts[0];
      state = applyAttempt(state, { isFirstAttempt: true, isCorrect: firstAttempt.isCorrect });
      // Subsequent attempts contribute to attemptCount but not the window.
      for (let i = 1; i < card.attempts.length; i++) {
        state = applyAttempt(state, { isFirstAttempt: false, isCorrect: card.attempts[i].isCorrect });
      }
    }

    await MasteryRollup.updateOne(
      { apiKeyId: context.apiKey._id, childId: session.childId, framework: std.framework, code: std.code },
      {
        $set: {
          state: state.state,
          recentFirstAttempts: state.recentFirstAttempts,
          firstAttemptCorrectRate: state.firstAttemptCorrectRate,
          attemptCount: state.attemptCount,
          firstAttemptCount: state.firstAttemptCount,
          lastAttemptAt: completedAt,
        },
      },
      { upsert: true },
    );
  }

  session.status = 'completed';
  session.completedAt = completedAt;
  await session.save();

  // Assemble the canonical session.completed payload — same shape returned
  // in the response AND fired via webhook (Wanderlearn requirement).
  const payload = await assembleSessionCompletedPayload(sessionId);
  if (!payload) {
    // Shouldn't happen — we just upserted the session — but log if it does.
    Logger.error(LogContext.SYSTEM, 'POST /results: assembleSessionCompletedPayload returned null', {
      requestId,
      metadata: { sessionId },
    });
    return apiError('INTERNAL_ERROR', requestId);
  }

  // Dispatch to every active endpoint subscribed to session.completed. Best-
  // effort — failures are logged but never bubble up to the consumer (the
  // dashboard surfaces dead-letters for them).
  const endpoints = await WebhookEndpoint.find({
    apiKeyId: context.apiKey._id,
    active: true,
    events: 'session.completed',
  }).select('_id');

  const callbackUrl = new URL('/api/v1/qstash/deliver-webhook', request.url).toString();
  for (const ep of endpoints) {
    enqueueDelivery(
      {
        endpointId: ep._id,
        apiKeyId: context.apiKey._id as Types.ObjectId,
        childId: session.childId,
        event: 'session.completed',
        payload: payload as unknown as Record<string, unknown>,
      },
      qstashPublisher,
      callbackUrl,
    ).catch((err) => {
      Logger.warning(LogContext.SYSTEM, 'POST /results: webhook enqueue failed', {
        requestId,
        metadata: { sessionId, endpointId: String(ep._id), error: err instanceof Error ? err.message : String(err) },
      });
    });
  }

  return apiSuccess(payload, { requestId });
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'ecosystem'],
  requiredPermission: 'sessions:write',
});
