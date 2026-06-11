/**
 * Provider smoke test — exercises the real lib/ai code path against live keys.
 *
 * Runs the active text provider (set by LLM_PROVIDER) through generateFlashcards
 * and evaluateAnswer, so you can confirm a provider actually returns valid
 * structured output before relying on it in the app.
 *
 * One provider (reads LLM_PROVIDER from env / .env.local):
 *   npx tsx --env-file=.env.local scripts/checkProviders.ts
 *
 * Force a specific provider for this run:
 *   LLM_PROVIDER=mistral npx tsx --env-file=.env.local scripts/checkProviders.ts
 *
 * All of them in sequence:
 *   for p in cerebras openrouter mistral together gemini; do \
 *     LLM_PROVIDER=$p npx tsx --env-file=.env.local scripts/checkProviders.ts; done
 *
 * Note: shell-provided LLM_PROVIDER overrides the .env.local value (dotenv does not
 * clobber existing process.env), so the loop above works as written.
 */

import { generateFlashcards, evaluateAnswer } from '../lib/ai/generate';
import { activeTextProvider } from '../lib/ai/providers';

async function main() {
  const provider = activeTextProvider;
  console.log(`\n=== Provider: ${provider} (LLM_PROVIDER=${process.env.LLM_PROVIDER ?? 'unset→default'}) ===`);

  // 1. Flashcard generation (generateObject, array output)
  try {
    const cards = await generateFlashcards({
      prompt: 'Generate 3 flashcards covering basic Spanish greetings.',
    });
    const ok = cards.length > 0 && cards.every((c) => c.front && c.back);
    console.log(`  flashcards: ${ok ? 'PASS' : 'FAIL'} (${cards.length} cards)`);
    if (cards[0]) console.log(`    e.g. front="${cards[0].front}"  back="${cards[0].back}"`);
  } catch (err) {
    console.log(`  flashcards: ERROR — ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Answer evaluation (generateObject, single object)
  try {
    const evalResult = await evaluateAnswer(
      'Question: "What is the capital of France?"\nCorrect answer: "Paris"\nUser answer: "paris"\nReturn isCorrect, a 0-1 similarity, and brief feedback.',
    );
    const ok = typeof evalResult.isCorrect === 'boolean' && evalResult.similarity >= 0 && evalResult.similarity <= 1;
    console.log(`  evaluate:   ${ok ? 'PASS' : 'FAIL'} (isCorrect=${evalResult.isCorrect}, similarity=${evalResult.similarity})`);
  } catch (err) {
    console.log(`  evaluate:   ERROR — ${err instanceof Error ? err.message : String(err)}`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
