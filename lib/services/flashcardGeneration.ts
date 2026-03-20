import { MODEL, FLASHCARD_MAX, FLASHCARD_MIN, getModelForKeyType } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { type ApiKeyType } from '@/types/api';

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

/**
 * Generates flashcards from a topic using the AI model.
 * When called from the public API, uses the Gemini key associated with the API key type.
 * When called from internal routes, uses the default MODEL.
 *
 * @param topic - The subject to generate flashcards about
 * @param requestId - Request ID for logging/tracing
 * @param keyType - Optional API key type (determines which Gemini key to use)
 * @returns Array of generated flashcard objects
 */
export async function generateFlashcardsFromAI(
  topic: string,
  requestId: string,
  keyType?: ApiKeyType
): Promise<GeneratedFlashcard[]> {
  const fullPrompt = `
    Based on the following topic, generate a set of ${FLASHCARD_MIN} to ${FLASHCARD_MAX} flashcards.
    The topic is: "${topic}".
    IMPORTANT: Use only information from vetted, peer-reviewed, and trustworthy sources to generate the content for these flashcards.
    Please respond with ONLY a valid JSON array of objects. Each object should represent a flashcard and have two properties: "front" (the question or term) and "back" (the answer or definition).
    Do not include any text, explanation, or markdown formatting before or after the JSON array.

    Example format:
    [\n      {\n        "front": "What is the capital of France?",\n        "back": "Paris"\n      },\n      {\n        "front": "What is 2 + 2?",\n        "back": "4"\n      }\n    ]
  `;

  try {
    // Use the appropriate Gemini model based on the API key type
    const model = keyType ? getModelForKeyType(keyType) : MODEL;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    if (!responseText) {
      await Logger.warning(LogContext.AI, 'AI returned an empty response.', {
        requestId,
        metadata: { topic },
      });
      throw new Error('AI returned an empty response.');
    }

    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      await Logger.warning(LogContext.AI, 'AI response did not contain a valid JSON array.', {
        requestId,
        metadata: { responseText },
      });
      throw new Error('Could not parse flashcards from AI response.');
    }

    const flashcards: GeneratedFlashcard[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(flashcards) || flashcards.some(card => !card.front || !card.back)) {
      await Logger.warning(LogContext.AI, 'Parsed JSON from AI is not in the expected Flashcard[] format.', {
        requestId,
        metadata: { parsedJson: flashcards },
      });
      throw new Error('Parsed JSON from AI is not in the expected Flashcard[] format.');
    }

    return flashcards;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await Logger.error(LogContext.AI, `Error in AI flashcard generation: ${errorMessage}`, {
      requestId,
      metadata: { error, stack: error instanceof Error ? error.stack : undefined },
    });
    throw error;
  }
}
