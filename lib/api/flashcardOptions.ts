import type { IFlashcardOption } from '@/models/FlashcardSet';

export type OptionsValidation =
  | { ok: true; value?: { options: IFlashcardOption[]; correctOptionId: string } }
  | { ok: false; error: string };

/**
 * Validate and normalize a card's authored multiple-choice options.
 *
 * Rules (all optional — a card with neither field is valid and behaves as before):
 *   - `options` must be an array of at least 2 items, each `{ id, text }` with
 *     non-empty strings and unique ids.
 *   - `correctOptionId` is required when options are present and must match one
 *     option id.
 *   - `correctOptionId` without `options` is rejected (it has nothing to point at).
 *
 * Returns `{ ok: true }` with no value when neither field is supplied, so callers
 * can simply omit both from the stored card.
 */
export function validateFlashcardOptions(rawOptions: unknown, rawCorrectOptionId: unknown): OptionsValidation {
  const hasOptions = rawOptions !== undefined && rawOptions !== null;
  const hasCorrect = rawCorrectOptionId !== undefined && rawCorrectOptionId !== null;

  if (!hasOptions && !hasCorrect) return { ok: true };

  if (!hasOptions && hasCorrect) {
    return { ok: false, error: 'correctOptionId was given without options.' };
  }
  if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
    return { ok: false, error: 'options must be an array of at least 2 items.' };
  }

  const options: IFlashcardOption[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rawOptions.length; i++) {
    const o = rawOptions[i] as { id?: unknown; text?: unknown };
    if (typeof o?.id !== 'string' || o.id.trim() === '') {
      return { ok: false, error: `options[${i}].id must be a non-empty string.` };
    }
    if (typeof o?.text !== 'string' || o.text.trim() === '') {
      return { ok: false, error: `options[${i}].text must be a non-empty string.` };
    }
    const id = o.id.trim();
    if (seen.has(id)) {
      return { ok: false, error: `Duplicate option id "${id}".` };
    }
    seen.add(id);
    options.push({ id, text: o.text.trim() });
  }

  if (typeof rawCorrectOptionId !== 'string' || rawCorrectOptionId.trim() === '') {
    return { ok: false, error: 'correctOptionId is required when options are present.' };
  }
  const correctOptionId = rawCorrectOptionId.trim();
  if (!seen.has(correctOptionId)) {
    return { ok: false, error: 'correctOptionId must match one of the option ids.' };
  }

  return { ok: true, value: { options, correctOptionId } };
}

export interface FlashcardInput {
  front?: unknown;
  back?: unknown;
  externalId?: unknown;
  options?: unknown;
  correctOptionId?: unknown;
  frontImage?: unknown;
  backImage?: unknown;
  frontImageAlt?: unknown;
  backImageAlt?: unknown;
}

// Card media must be an https URL (our Cloudinary or a partner CDN). We render it
// as an <img>/<video> src, so a plain http or non-URL value is rejected.
function readImageUrl(value: unknown, field: string): { ok: true; url?: string } | { ok: false; error: string } {
  if (value === undefined || value === null || value === '') return { ok: true };
  if (typeof value !== 'string' || !/^https:\/\/\S+$/.test(value.trim())) {
    return { ok: false, error: `${field} must be an https URL.` };
  }
  return { ok: true, url: value.trim() };
}

const DEFAULT_ML_DATA = () => ({ easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date() });

/**
 * Validate one card from an API request and build the embedded document to
 * store. Shared by POST /sets and PATCH /sets/[id] so the rules stay in one place.
 */
export function buildFlashcardDoc(
  card: FlashcardInput,
): { ok: true; doc: Record<string, unknown> } | { ok: false; error: string } {
  if (typeof card.front !== 'string' || card.front.trim() === '' ||
      typeof card.back !== 'string' || card.back.trim() === '') {
    return { ok: false, error: 'Each flashcard must have front and back fields.' };
  }

  const optionsResult = validateFlashcardOptions(card.options, card.correctOptionId);
  if (!optionsResult.ok) return { ok: false, error: optionsResult.error };

  const frontImage = readImageUrl(card.frontImage, 'frontImage');
  if (!frontImage.ok) return { ok: false, error: frontImage.error };
  const backImage = readImageUrl(card.backImage, 'backImage');
  if (!backImage.ok) return { ok: false, error: backImage.error };

  const doc: Record<string, unknown> = { front: card.front, back: card.back, mlData: DEFAULT_ML_DATA() };
  if (typeof card.externalId === 'string' && card.externalId.trim() !== '') {
    doc.externalId = card.externalId.trim();
  }
  if (optionsResult.value) {
    doc.options = optionsResult.value.options;
    doc.correctOptionId = optionsResult.value.correctOptionId;
  }
  if (frontImage.url) doc.frontImage = frontImage.url;
  if (backImage.url) doc.backImage = backImage.url;
  if (typeof card.frontImageAlt === 'string' && card.frontImageAlt.trim() !== '') doc.frontImageAlt = card.frontImageAlt.trim();
  if (typeof card.backImageAlt === 'string' && card.backImageAlt.trim() !== '') doc.backImageAlt = card.backImageAlt.trim();
  return { ok: true, doc };
}

export interface StoredCardLike {
  _id: unknown;
  front: string;
  back: string;
  externalId?: string;
  options?: IFlashcardOption[];
  correctOptionId?: string;
  frontImage?: string;
  backImage?: string;
  frontImageAlt?: string;
  backImageAlt?: string;
}

/**
 * Shape a stored card into the public API response. Used by POST /sets and
 * GET /sets/[id] so the card surface stays consistent. Omits options when a card
 * has none.
 */
export function serializeApiCard(c: StoredCardLike) {
  return {
    id: String(c._id),
    front: c.front,
    back: c.back,
    externalId: c.externalId,
    options: Array.isArray(c.options) && c.options.length > 0
      ? c.options.map((o) => ({ id: o.id, text: o.text }))
      : undefined,
    correctOptionId: c.correctOptionId,
    frontImage: c.frontImage,
    backImage: c.backImage,
    frontImageAlt: c.frontImageAlt,
    backImageAlt: c.backImageAlt,
  };
}
