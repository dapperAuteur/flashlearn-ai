import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import { ingestExternalResults, type ResolvedResult } from '@/lib/api/externalStudentStudy';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/study/external-results
 *
 * Ingest study/quiz outcomes captured outside FlashLearn (e.g. a partner's own
 * course quiz) to drive per-student SM-2 scheduling. Cards are addressed by the
 * `externalId` set at creation, so the partner never needs FlashLearn's internal
 * card ids. Idempotent on (externalStudentId, cardExternalId, occurredAt).
 *
 * Body:
 * {
 *   "setId": "...",
 *   "externalStudentId": "academy-user-123",
 *   "results": [
 *     { "cardExternalId": "ces:m8:q3", "isCorrect": false,
 *       "confidenceRating": 2, "source": "course_quiz",
 *       "occurredAt": "2026-06-18T13:00:00Z" }
 *   ]
 * }
 */
interface ResultsBody {
  setId?: unknown;
  externalStudentId?: unknown;
  results?: unknown;
}

interface IncomingResult {
  cardExternalId: string;
  isCorrect: boolean;
  confidenceRating?: number;
  source?: string;
  occurredAt: Date;
}

function validateBody(
  body: ResultsBody,
): { setId: string; externalStudentId: string; results: IncomingResult[] } | { error: string; field?: string } {
  if (typeof body.setId !== 'string' || !Types.ObjectId.isValid(body.setId)) {
    return { error: 'setId is required and must be a valid id.', field: 'setId' };
  }
  if (typeof body.externalStudentId !== 'string' || body.externalStudentId.trim() === '') {
    return { error: 'externalStudentId is required.', field: 'externalStudentId' };
  }
  if (!Array.isArray(body.results) || body.results.length === 0) {
    return { error: 'results must be a non-empty array.', field: 'results' };
  }

  const results: IncomingResult[] = [];
  for (let i = 0; i < body.results.length; i++) {
    const r = body.results[i] as Record<string, unknown>;
    if (typeof r.cardExternalId !== 'string' || r.cardExternalId.trim() === '') {
      return { error: `results[${i}].cardExternalId is required.`, field: `results[${i}].cardExternalId` };
    }
    if (typeof r.isCorrect !== 'boolean') {
      return { error: `results[${i}].isCorrect must be boolean.`, field: `results[${i}].isCorrect` };
    }
    if (typeof r.occurredAt !== 'string') {
      return { error: `results[${i}].occurredAt must be an ISO-8601 string.`, field: `results[${i}].occurredAt` };
    }
    const occurredAt = new Date(r.occurredAt);
    if (isNaN(occurredAt.getTime())) {
      return { error: `results[${i}].occurredAt must be a valid ISO-8601 timestamp.`, field: `results[${i}].occurredAt` };
    }
    const result: IncomingResult = {
      cardExternalId: r.cardExternalId.trim(),
      isCorrect: r.isCorrect,
      occurredAt,
    };
    if (typeof r.confidenceRating === 'number' && [1, 2, 3, 4, 5].includes(r.confidenceRating)) {
      result.confidenceRating = r.confidenceRating;
    }
    if (typeof r.source === 'string' && r.source.trim() !== '') {
      result.source = r.source.trim();
    }
    results.push(result);
  }

  return { setId: body.setId, externalStudentId: body.externalStudentId.trim(), results };
}

async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
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

  // The set must belong to the key owner. Partner-created sets live under the
  // owner's profile, so this also stops one key writing to another's set.
  const set = await FlashcardSetModel.findById(validated.setId)
    .select('profile flashcards')
    .lean<{ profile: Types.ObjectId; flashcards: { _id: Types.ObjectId; externalId?: string }[] } | null>();
  if (!set) {
    return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');
  }
  const profiles = await ProfileModel.find({ user: context.user._id }).select('_id').lean<{ _id: Types.ObjectId }[]>();
  const ownsSet = profiles.some((p) => String(p._id) === String(set.profile));
  if (!ownsSet) {
    return apiError('FORBIDDEN', requestId, undefined, 'You do not own this flashcard set.');
  }

  // Map the partner's externalId -> the embedded card _id. Unknown ids are
  // reported back rather than silently dropped.
  const cardByExternalId = new Map<string, Types.ObjectId>();
  for (const card of set.flashcards) {
    if (typeof card.externalId === 'string' && card.externalId.trim() !== '') {
      cardByExternalId.set(card.externalId, card._id);
    }
  }

  const resolved: ResolvedResult[] = [];
  const unresolved: string[] = [];
  for (const r of validated.results) {
    const cardId = cardByExternalId.get(r.cardExternalId);
    if (!cardId) {
      if (!unresolved.includes(r.cardExternalId)) unresolved.push(r.cardExternalId);
      continue;
    }
    resolved.push({
      cardId,
      cardExternalId: r.cardExternalId,
      isCorrect: r.isCorrect,
      confidenceRating: r.confidenceRating,
      source: r.source,
      occurredAt: r.occurredAt,
    });
  }

  const summary = resolved.length
    ? await ingestExternalResults({
        apiKeyId: context.apiKey._id as Types.ObjectId,
        externalStudentId: validated.externalStudentId,
        setId: new Types.ObjectId(validated.setId),
        results: resolved,
      })
    : { applied: 0, duplicates: 0 };

  return apiSuccess(
    {
      setId: validated.setId,
      externalStudentId: validated.externalStudentId,
      applied: summary.applied,
      duplicates: summary.duplicates,
      unresolvedCardExternalIds: unresolved,
    },
    { requestId },
  );
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app', 'ecosystem'],
  requiredPermission: 'study:write',
});
