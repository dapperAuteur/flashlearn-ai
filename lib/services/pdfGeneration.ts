import { FLASHCARD_MIN } from '@/lib/constants';
import { getFlashcardMax } from '@/lib/appConfigValues';
import { generateFlashcards, type GeneratedFlashcard } from '@/lib/ai/generate';
import { PDFParse } from 'pdf-parse';
import {
  buildSourcePrompt,
  sanitizeUserInstructions,
  MAX_USER_INSTRUCTIONS_LENGTH,
} from '@/lib/services/buildGenerationPrompt';
import { type ApiKeyType } from '@/types/api';

/** Largest upload accepted, in bytes. */
export const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
/** Characters of extracted text sent to the provider. Longer documents are truncated. */
export const MAX_PDF_TEXT_LENGTH = 50000;
/** Below this, the extraction is treated as a scanned or image-only PDF. */
export const MIN_PDF_TEXT_LENGTH = 20;

export type PdfGenerationFailureCode =
  | 'INSTRUCTIONS_TOO_LONG'
  | 'NO_FILE'
  | 'NOT_PDF'
  | 'FILE_TOO_LARGE'
  | 'NO_TEXT'
  | 'NO_CARDS';

export interface PdfGenerationFailure {
  ok: false;
  code: PdfGenerationFailureCode;
  message: string;
}

export interface PdfGenerationSuccess {
  ok: true;
  flashcards: GeneratedFlashcard[];
  pageCount: number;
  textLength: number;
}

export type PdfGenerationOutcome = PdfGenerationSuccess | PdfGenerationFailure;

export interface PdfGenerationInput {
  /** The uploaded file, or null when the caller sent no `file` field. */
  file: File | null;
  /** Raw `prompt` field from the request, before sanitizing. */
  rawPrompt?: unknown;
  /** API key type, threaded through to provider selection for v1 callers. */
  keyType?: ApiKeyType;
}

function fail(code: PdfGenerationFailureCode, message: string): PdfGenerationFailure {
  return { ok: false, code, message };
}

/**
 * Validates a PDF upload and turns it into flashcards.
 *
 * Every rejection happens before the provider call, so a bad upload costs nothing.
 * Callers own the response envelope and the usage accounting; this function only
 * reports what went wrong through `code` and a caller-ready `message`.
 *
 * Provider failures are thrown rather than returned, so callers can keep their own
 * handling for a provider 429.
 */
export async function generateFlashcardsFromPdf(
  input: PdfGenerationInput
): Promise<PdfGenerationOutcome> {
  const { file, rawPrompt, keyType } = input;

  if (typeof rawPrompt === 'string' && rawPrompt.trim().length > MAX_USER_INSTRUCTIONS_LENGTH) {
    return fail(
      'INSTRUCTIONS_TOO_LONG',
      `Instructions must be ${MAX_USER_INSTRUCTIONS_LENGTH} characters or fewer.`
    );
  }
  const userInstructions = sanitizeUserInstructions(rawPrompt);

  if (!file) {
    return fail('NO_FILE', 'No PDF file provided');
  }

  if (!file.type.includes('pdf')) {
    return fail('NOT_PDF', 'File must be a PDF');
  }

  if (file.size > MAX_PDF_SIZE) {
    return fail('FILE_TOO_LARGE', 'PDF must be under 20MB');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  await parser.destroy();
  let text = textResult.text?.trim();
  const pageCount = textResult.total || 0;

  if (!text || text.length < MIN_PDF_TEXT_LENGTH) {
    return fail(
      'NO_TEXT',
      'Could not extract enough text from this PDF. It may be image-based; try the Image upload instead.'
    );
  }

  if (text.length > MAX_PDF_TEXT_LENGTH) {
    text = text.substring(0, MAX_PDF_TEXT_LENGTH);
  }

  const prompt = buildSourcePrompt({
    sourceKind: 'pdf',
    body: text,
    userInstructions,
    min: FLASHCARD_MIN,
    max: await getFlashcardMax(),
  });

  const flashcards = await generateFlashcards({ prompt, keyType });
  if (flashcards.length === 0) {
    return fail('NO_CARDS', 'Failed to generate flashcards from PDF content.');
  }

  return { ok: true, flashcards, pageCount, textLength: text.length };
}
