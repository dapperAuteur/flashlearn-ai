import { generateObject, generateText } from 'ai';
import { getTextModel, getVisionModel } from './providers';
import {
  FlashcardSchema,
  EvaluationSchema,
  ChoiceSchema,
  BannerSchema,
  type GeneratedFlashcard,
  type Evaluation,
  type Choice,
} from './schemas';
import { type ApiKeyType } from '@/types/api';

/**
 * Structured-generation helpers shared by every AI route. Routes call these instead
 * of importing `ai`/`zod` or a provider SDK directly. Provider selection lives in
 * ./providers. Output validation lives in ./schemas (generateObject throws on a
 * schema mismatch, so callers no longer hand-parse responses).
 */

export type { GeneratedFlashcard } from './schemas';

interface FlashcardOptions {
  prompt: string;
  /** Base64 data URLs (`data:<mime>;base64,...`). When present, routes to the vision model. */
  imageDataUrls?: string[];
  keyType?: ApiKeyType;
}

/** Generate a flashcard array from a text prompt, or from images + a prompt. */
export async function generateFlashcards(opts: FlashcardOptions): Promise<GeneratedFlashcard[]> {
  const { prompt, imageDataUrls, keyType } = opts;

  if (imageDataUrls && imageDataUrls.length > 0) {
    const { object } = await generateObject({
      model: getVisionModel(),
      output: 'array',
      schema: FlashcardSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageDataUrls.map((url) => ({ type: 'image' as const, image: url })),
          ],
        },
      ],
    });
    return cleanCards(object);
  }

  const { object } = await generateObject({
    model: getTextModel(keyType),
    output: 'array',
    schema: FlashcardSchema,
    prompt,
  });
  return cleanCards(object);
}

/** Drop cards missing a front or back (schema constraints are kept loose for provider compatibility). */
function cleanCards(cards: GeneratedFlashcard[]): GeneratedFlashcard[] {
  return cards.filter((c) => c.front?.trim() && c.back?.trim());
}

/** Evaluate a typed answer against the correct answer. */
export async function evaluateAnswer(prompt: string, keyType?: ApiKeyType): Promise<Evaluation> {
  const { object } = await generateObject({
    model: getTextModel(keyType),
    schema: EvaluationSchema,
    prompt,
  });
  // Clamp similarity to [0,1] — the schema keeps the bound loose for provider compatibility.
  return { ...object, similarity: Math.max(0, Math.min(1, object.similarity)) };
}

/** Generate multiple-choice distractors for a batch of flashcards. */
export async function generateChoices(prompt: string, keyType?: ApiKeyType): Promise<Choice[]> {
  const { object } = await generateObject({
    model: getTextModel(keyType),
    output: 'array',
    schema: ChoiceSchema,
    prompt,
  });
  return object;
}

/** Generate announcement banner messages. */
export async function generateBanner(prompt: string): Promise<string[]> {
  const { object } = await generateObject({
    model: getTextModel(),
    schema: BannerSchema,
    prompt,
  });
  return object.messages;
}

/** Plain text generation (used by the RAG knowledge assistant). */
export async function generateRagAnswer(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: getTextModel(),
    prompt,
  });
  return text;
}
