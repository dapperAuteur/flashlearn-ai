import { Types } from 'mongoose';
import { CardAttempt } from '@/models/CardAttempt';
import { EcosystemSession } from '@/models/EcosystemSession';

// Wanderlearn requirement (plans/ecosystem/flashlearn-ai-feedback.md):
// the POST /sessions/:id/results response body must mirror the webhook
// payload exactly so the consumer can update its UI immediately on POST
// success and treat the webhook purely as audit.
//
// This pure helper assembles the canonical `session.completed` payload from
// persisted CardAttempt + EcosystemSession rows. Both the route response and
// the dispatcher invocation call it.

export interface SessionCompletedCard {
  cardId: string;
  standardCode?: string;
  correctOnFirstAttempt: boolean;
  attempts: number;
  latencyMs: number;
}

export interface SessionCompletedPayload {
  type: 'session.completed';
  sessionId: string;
  childId: string;
  completedAt: string;
  cards: SessionCompletedCard[];
}

export async function assembleSessionCompletedPayload(
  sessionId: string,
): Promise<SessionCompletedPayload | null> {
  const session = await EcosystemSession.findOne({ sessionId }).lean<{
    sessionId: string;
    childId: string;
    completedAt?: Date;
    apiKeyId: Types.ObjectId;
  } | null>();

  if (!session) return null;

  const attempts = await CardAttempt.find({ sessionId })
    .sort({ cardId: 1, attemptNumber: 1 })
    .lean<Array<{
      cardId: Types.ObjectId;
      standardCodes: Array<{ framework: string; code: string }>;
      attemptNumber: number;
      correctOnFirstAttempt: boolean;
      isCorrect: boolean;
      latencyMs: number;
    }>>();

  // Group by cardId — one entry per card, summarizing all attempts.
  const byCard = new Map<string, {
    cardId: string;
    standardCode?: string;
    correctOnFirstAttempt: boolean;
    attempts: number;
    latencyMs: number;
  }>();

  for (const a of attempts) {
    const key = String(a.cardId);
    const existing = byCard.get(key);
    if (existing) {
      existing.attempts += 1;
      // Total latency across attempts on this card. Consumers can divide
      // by attempts for an average if they want.
      existing.latencyMs += a.latencyMs;
    } else {
      byCard.set(key, {
        cardId: key,
        // First (primary) standard the card was tagged to. Cards in the
        // ecosystem flow are usually single-standard but the schema allows
        // multi-standard tagging — we surface the first one for the webhook.
        standardCode: a.standardCodes[0]?.code,
        correctOnFirstAttempt: a.correctOnFirstAttempt,
        attempts: 1,
        latencyMs: a.latencyMs,
      });
    }
  }

  return {
    type: 'session.completed',
    sessionId: session.sessionId,
    childId: session.childId,
    completedAt: (session.completedAt ?? new Date()).toISOString(),
    cards: Array.from(byCard.values()),
  };
}
