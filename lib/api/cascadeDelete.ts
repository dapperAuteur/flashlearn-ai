import { Types } from 'mongoose';
import { EcosystemSession } from '@/models/EcosystemSession';
import { CardAttempt } from '@/models/CardAttempt';
import { MasteryRollup } from '@/models/MasteryRollup';
import { WebhookDelivery } from '@/models/WebhookDelivery';
import { FlashcardSet } from '@/models/FlashcardSet';
import { CascadePurgeLog } from '@/models/CascadePurgeLog';

export interface PurgeMeta {
  requestId: string;
  requesterIp: string;
}

export interface PurgeOptions {
  // Injected by callers that have a live QStash client (PR 2+). PR 1 callers
  // can omit it; orphaned QStash messages no-op on the callback side because
  // the target session/delivery row is gone.
  cancelQStashMessage?: (messageId: string) => Promise<void>;
}

export interface PurgeResult {
  purgedRecordCount: number;
  byCollection: Record<string, number>;
  cancelledQStashMessages: number;
}

// Cascade-delete every artifact derived from a single (apiKeyId, childId)
// tuple. The order matters: webhooks first so we never POST PII for a child
// who is mid-deletion, then attempts/rollups, then the deck content, then the
// session row that holds the join keys, then the audit log entry.
//
// Idempotency: re-running this on a child with no remaining data returns
// `purgedRecordCount: 0` but still inserts a fresh log row so the route layer
// can distinguish "already purged" (200) from "never existed" (404) by
// checking for any prior CascadePurgeLog row.
//
// No Mongo transaction: Atlas free-tier sandbox is not guaranteed to be a
// replica set. Each step is monotonic + idempotent; a partial failure leaves
// orphans which the next call sweeps.
export async function purgeChildData(
  apiKeyId: Types.ObjectId | string,
  childId: string,
  meta: PurgeMeta,
  opts: PurgeOptions = {},
): Promise<PurgeResult> {
  const requestedAt = new Date();
  const apiKeyObjId = typeof apiKeyId === 'string' ? new Types.ObjectId(apiKeyId) : apiKeyId;
  const byCollection: Record<string, number> = {};
  let cancelledQStashMessages = 0;

  // Step 1: collect QStash message ids from pending sessions + deliveries so
  // we can ask QStash to drop scheduled work that no longer has a target.
  if (opts.cancelQStashMessage) {
    const pendingSessions = await EcosystemSession.find(
      { apiKeyId: apiKeyObjId, childId, status: 'scheduled' },
      { qstashMessageId: 1 },
    ).lean<Array<{ qstashMessageId?: string }>>();

    const pendingDeliveries = await WebhookDelivery.find(
      { apiKeyId: apiKeyObjId, childId, status: 'pending' },
      { qstashMessageId: 1 },
    ).lean<Array<{ qstashMessageId?: string }>>();

    const messageIds = [...pendingSessions, ...pendingDeliveries]
      .map((doc) => doc.qstashMessageId)
      .filter((id): id is string => Boolean(id));

    for (const id of messageIds) {
      try {
        await opts.cancelQStashMessage(id);
        cancelledQStashMessages += 1;
      } catch {
        // best-effort — orphans are harmless because the callback will no-op.
      }
    }
  }

  // Step 2: webhook deliveries (use denormalized childId for cheap delete).
  const deliveriesResult = await WebhookDelivery.deleteMany({
    apiKeyId: apiKeyObjId,
    childId,
  });
  byCollection.webhook_deliveries = deliveriesResult.deletedCount ?? 0;

  // Step 3: per-attempt records.
  const attemptsResult = await CardAttempt.deleteMany({
    apiKeyId: apiKeyObjId,
    childId,
  });
  byCollection.card_attempts = attemptsResult.deletedCount ?? 0;

  // Step 4: mastery rollups.
  const rollupsResult = await MasteryRollup.deleteMany({
    apiKeyId: apiKeyObjId,
    childId,
  });
  byCollection.mastery_rollups = rollupsResult.deletedCount ?? 0;

  // Step 5: collect FlashcardSet ids derived from this child's sessions
  // before deleting the sessions themselves.
  const sessions = await EcosystemSession.find(
    { apiKeyId: apiKeyObjId, childId },
    { flashcardSetId: 1 },
  ).lean<Array<{ flashcardSetId?: Types.ObjectId }>>();

  const setIds = sessions
    .map((s) => s.flashcardSetId)
    .filter((id): id is Types.ObjectId => Boolean(id));

  if (setIds.length > 0) {
    const setsResult = await FlashcardSet.deleteMany({ _id: { $in: setIds } });
    byCollection.flashcard_sets = setsResult.deletedCount ?? 0;
  } else {
    byCollection.flashcard_sets = 0;
  }

  // Step 6: the session rows themselves.
  const sessionsResult = await EcosystemSession.deleteMany({
    apiKeyId: apiKeyObjId,
    childId,
  });
  byCollection.ecosystem_sessions = sessionsResult.deletedCount ?? 0;

  const purgedRecordCount = Object.values(byCollection).reduce((a, b) => a + b, 0);

  // Step 7: audit log. Always inserted, even on a no-op purge — the route
  // layer keys idempotency off "any prior log row exists for this tuple."
  await CascadePurgeLog.create({
    apiKeyId: apiKeyObjId,
    childId,
    requestedAt,
    completedAt: new Date(),
    purgedRecordCount,
    byCollection,
    requesterIp: meta.requesterIp,
    requestId: meta.requestId,
  });

  return { purgedRecordCount, byCollection, cancelledQStashMessages };
}

// True iff this (apiKeyId, childId) tuple was ever purged. Route layer uses
// this to distinguish 200-with-zero-count (idempotent re-delete) from 404
// (truly unknown child).
export async function hasPriorPurge(
  apiKeyId: Types.ObjectId | string,
  childId: string,
): Promise<boolean> {
  const apiKeyObjId = typeof apiKeyId === 'string' ? new Types.ObjectId(apiKeyId) : apiKeyId;
  const existing = await CascadePurgeLog.exists({ apiKeyId: apiKeyObjId, childId });
  return existing !== null;
}
