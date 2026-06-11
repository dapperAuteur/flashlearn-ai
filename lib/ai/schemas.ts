import { z } from 'zod';

/**
 * Zod schemas describing the structured output of each AI feature. These are passed
 * to the AI SDK's `generateObject`, which validates (and retries) the model output
 * against them — replacing the old fragile regex + manual-validation parsing.
 *
 * Constraints are kept loose on purpose: Zod string/number/array constraints (.min,
 * .max, .length) translate to JSON Schema keywords (minLength, minimum, minItems…)
 * that some providers' structured-output validators reject (e.g. Cerebras rejects
 * `minLength`). Guidance lives in .describe() instead, and the generate helpers do
 * the light runtime validation (drop empty cards, slice distractors to 3).
 */

export const FlashcardSchema = z.object({
  front: z.string().describe('The question or term on the front of the card. Non-empty.'),
  back: z.string().describe('The answer or definition on the back of the card. Non-empty.'),
});
export type GeneratedFlashcard = z.infer<typeof FlashcardSchema>;

export const EvaluationSchema = z.object({
  isCorrect: z.boolean(),
  similarity: z.number().describe('0.0-1.0: 1.0 = perfect, 0.7-0.99 = essentially correct, 0.4-0.69 = partial, <0.4 = incorrect.'),
  feedback: z.string().describe('A brief explanation of the evaluation.'),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const ChoiceSchema = z.object({
  id: z.string().describe('The flashcard id this set of distractors belongs to.'),
  distractors: z.array(z.string()).describe('Exactly 3 plausible but incorrect answer choices.'),
});
export type Choice = z.infer<typeof ChoiceSchema>;

export const BannerSchema = z.object({
  messages: z.array(z.string()).describe('Short announcement banner messages.'),
});
