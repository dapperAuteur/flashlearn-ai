import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { generateFlashcardsFromAI } from '@/lib/services/flashcardGeneration';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import { CurriculumStandard } from '@/models/CurriculumStandard';
import { EcosystemSession } from '@/models/EcosystemSession';
import { MasteryRollup } from '@/models/MasteryRollup';
import { nextLocalMidnight } from '@/lib/api/sessionScheduling';
import { qstashPublisher } from '@/lib/qstash/client';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

interface SessionsBody {
  childId?: unknown;
  ageBand?: unknown;
  standards?: unknown;
  sourceContext?: unknown;
  tz?: unknown;
}

interface ValidatedBody {
  childId: string;
  ageBand: '4-7' | '8-12' | '13-18';
  standards: Array<{ framework: string; code: string }>;
  sourceContext: { consumer: string; bookId?: string; hubId?: string; completedAt: Date };
  tz: string;
}

function validateBody(body: SessionsBody): ValidatedBody | { error: string; field?: string } {
  if (!body.childId || typeof body.childId !== 'string' || body.childId.trim() === '') {
    return { error: 'childId is required and must be a non-empty string.', field: 'childId' };
  }
  if (body.ageBand !== '4-7' && body.ageBand !== '8-12' && body.ageBand !== '13-18') {
    return { error: 'ageBand must be one of "4-7", "8-12", or "13-18".', field: 'ageBand' };
  }
  if (!Array.isArray(body.standards) || body.standards.length === 0) {
    return { error: 'standards must be a non-empty array.', field: 'standards' };
  }
  const standards: Array<{ framework: string; code: string }> = [];
  for (const s of body.standards) {
    if (
      typeof s !== 'object' || s === null ||
      typeof (s as { framework?: unknown }).framework !== 'string' ||
      typeof (s as { code?: unknown }).code !== 'string'
    ) {
      return { error: 'Each standard must have string `framework` and `code`.', field: 'standards' };
    }
    standards.push({
      framework: (s as { framework: string }).framework,
      code: (s as { code: string }).code,
    });
  }
  const ctx = body.sourceContext;
  if (
    typeof ctx !== 'object' || ctx === null ||
    typeof (ctx as { consumer?: unknown }).consumer !== 'string' ||
    typeof (ctx as { completedAt?: unknown }).completedAt !== 'string'
  ) {
    return { error: 'sourceContext.consumer (string) and sourceContext.completedAt (ISO string) are required.', field: 'sourceContext' };
  }
  const completedAt = new Date((ctx as { completedAt: string }).completedAt);
  if (isNaN(completedAt.getTime())) {
    return { error: 'sourceContext.completedAt must be a valid ISO-8601 timestamp.', field: 'sourceContext.completedAt' };
  }
  const tz = typeof body.tz === 'string' && body.tz.length > 0 ? body.tz : 'UTC';
  const sourceContext: ValidatedBody['sourceContext'] = {
    consumer: (ctx as { consumer: string }).consumer,
    completedAt,
  };
  if (typeof (ctx as { bookId?: unknown }).bookId === 'string') {
    sourceContext.bookId = (ctx as { bookId: string }).bookId;
  }
  if (typeof (ctx as { hubId?: unknown }).hubId === 'string') {
    sourceContext.hubId = (ctx as { hubId: string }).hubId;
  }
  return {
    childId: body.childId.trim(),
    ageBand: body.ageBand as ValidatedBody['ageBand'],
    standards,
    sourceContext,
    tz,
  };
}

// Build a topic prompt from the standard codes. We resolve framework/code to
// their human-readable titles via CurriculumStandard so the AI gets a
// meaningful prompt instead of opaque codes.
function buildTopic(
  standardTitles: string[],
  ageBand: ValidatedBody['ageBand'],
  consumer: string,
): string {
  const focus = standardTitles.join(' and ');
  return `Comprehension check for a ${ageBand} learner via ${consumer}. Focus standards: ${focus}.`;
}

async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
  let body: SessionsBody;
  try {
    body = (await request.json()) as SessionsBody;
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const validated = validateBody(body);
  if ('error' in validated) {
    return apiError('INVALID_INPUT', requestId, validated.field ? { field: validated.field } : undefined, validated.error);
  }

  await dbConnect();

  // Resolve standards. Reject the request if any code is unknown — silent
  // ignore would leave consumers with sessions tagged to non-existent
  // curriculum entries that mastery rollups can never report on.
  const standardDocs = await CurriculumStandard.find({
    $or: validated.standards.map((s) => ({ framework: s.framework, code: s.code, active: true })),
  }).lean<Array<{ framework: string; code: string; title: string }>>();

  if (standardDocs.length !== validated.standards.length) {
    const known = new Set(standardDocs.map((s) => `${s.framework}:${s.code}`));
    const unknown = validated.standards.filter((s) => !known.has(`${s.framework}:${s.code}`));
    return apiError(
      'INVALID_INPUT',
      requestId,
      { unknownStandards: unknown },
      'One or more standards are not registered in the curriculum library.',
    );
  }

  // Generate the deck via the existing AI pipeline.
  let flashcards;
  try {
    flashcards = await generateFlashcardsFromAI(
      buildTopic(standardDocs.map((s) => s.title), validated.ageBand, validated.sourceContext.consumer),
      requestId,
      context.keyType,
    );
  } catch {
    return apiError('AI_GENERATION_FAILED', requestId);
  }

  if (!flashcards || flashcards.length === 0) {
    return apiError('AI_GENERATION_FAILED', requestId, undefined, 'No flashcards generated.');
  }

  // Reuse the existing FlashcardSet model so we get embedded SM-2 mlData
  // initialization and the entire study pipeline for free.
  let userProfile = await ProfileModel.findOne({ user: context.user._id });
  if (!userProfile) {
    userProfile = await ProfileModel.create({
      user: context.user._id,
      profileName: 'Default Profile',
    });
  }

  const newSet = await FlashcardSetModel.create({
    profile: userProfile._id,
    title: `Session ${validated.childId} · ${validated.sourceContext.consumer}`,
    isPublic: false,
    source: 'Prompt',
    flashcards: flashcards.map((card) => ({
      ...card,
      mlData: { easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date() },
    })),
    cardCount: flashcards.length,
  });

  const sessionId = randomUUID();
  const scheduledFor = nextLocalMidnight(validated.tz);

  const session = await EcosystemSession.create({
    sessionId,
    apiKeyId: context.apiKey._id,
    childId: validated.childId,
    ageBand: validated.ageBand,
    standards: validated.standards,
    sourceContext: validated.sourceContext,
    flashcardSetId: newSet._id,
    estimatedCardCount: flashcards.length,
    scheduledFor,
    status: 'scheduled',
  });

  // Upsert MasteryRollup rows in 'exposed' state for every standard the
  // session references. State machine bumps to 'practiced' / 'demonstrated'
  // as attempts arrive via the results endpoint.
  await Promise.all(
    validated.standards.map((s) =>
      MasteryRollup.updateOne(
        { apiKeyId: context.apiKey._id, childId: validated.childId, framework: s.framework, code: s.code },
        { $setOnInsert: { state: 'exposed' }, $set: { lastSessionAt: new Date() } },
        { upsert: true },
      ),
    ),
  );

  // Schedule the next-day delivery callback. Best-effort: if QStash publish
  // fails, the session row exists with status='scheduled' and a future
  // scheduledFor; a reconciliation cron (later PR) re-publishes orphans.
  try {
    const callbackUrl = new URL('/api/v1/qstash/deliver-session', request.url).toString();
    const delaySeconds = Math.max(0, Math.floor((scheduledFor.getTime() - Date.now()) / 1000));
    const { messageId } = await qstashPublisher.publishJSON({
      url: callbackUrl,
      body: { deliveryId: sessionId },
      delay: delaySeconds,
    });
    session.qstashMessageId = messageId;
    await session.save();
  } catch (err) {
    Logger.warning(LogContext.SYSTEM, 'POST /sessions: QStash schedule failed; sweeper will recover', {
      requestId,
      metadata: { sessionId, error: err instanceof Error ? err.message : String(err) },
    });
  }

  return apiSuccess(
    {
      sessionId,
      scheduledFor: scheduledFor.toISOString(),
      estimatedCardCount: flashcards.length,
    },
    { requestId },
    201,
  );
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'ecosystem'],
  requiredPermission: 'sessions:write',
  isGenerationRoute: true,
});

// Suppress unused-import warning for Types when it isn't used elsewhere.
void Types;
