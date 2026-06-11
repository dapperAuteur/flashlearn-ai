import { NextRequest, NextResponse } from 'next/server';
import { generateChoices } from '@/lib/ai/generate';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';

interface ChoiceRequest {
  cards: { id: string; front: string; back: string }[];
}

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

  // Rate limit: 30 choice generations per hour per IP
  try {
    const rateLimiter = getRateLimiter('mc-choices', 30, 3600);
    const { success } = await rateLimiter.limit(clientIP);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before generating more choices.' },
        { status: 429 },
      );
    }
  } catch {
    // Rate limiter unavailable — proceed without rate limiting
  }

  try {
    const { cards } = (await request.json()) as ChoiceRequest;

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: 'No cards provided' }, { status: 400 });
    }

    // Limit batch size
    const batch = cards.slice(0, 30);

    const prompt = `You are helping create a multiple choice quiz from flashcards. For each flashcard below, generate exactly 3 plausible but WRONG answer choices (distractors). The distractors should be believable but clearly incorrect to someone who knows the material.

FLASHCARDS:
${batch.map((c, i) => `${i + 1}. Question: ${c.front}\n   Correct Answer: ${c.back}`).join('\n')}

Respond with ONLY a valid JSON array. Each element should have "id" (the card id) and "distractors" (array of exactly 3 wrong answer strings). Keep distractors concise and similar in length/style to the correct answer.

Example:
[{"id":"abc123","distractors":["Wrong A","Wrong B","Wrong C"]}]`;

    const parsed = await generateChoices(prompt);

    // Build a map for quick lookup
    const choicesMap: Record<string, string[]> = {};
    for (const item of parsed) {
      if (item.id && Array.isArray(item.distractors)) {
        choicesMap[item.id] = item.distractors.slice(0, 3);
      }
    }

    return NextResponse.json({ choices: choicesMap });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    Logger.error(LogContext.AI, 'Failed to generate multiple choice distractors', { error: msg });
    return NextResponse.json({ error: 'Failed to generate choices' }, { status: 500 });
  }
}
