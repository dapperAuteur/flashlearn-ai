import { NextRequest, NextResponse } from 'next/server';
import { MODEL } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

  const rateLimiter = getRateLimiter('eval-answer', 60, 3600);
  const { success } = await rateLimiter.limit(clientIP);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait.' },
      { status: 429 },
    );
  }

  try {
    const { userAnswer, correctAnswer, question } = await request.json();

    if (!userAnswer || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Quick exact match check (case-insensitive, trimmed)
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();

    if (normalizedUser === normalizedCorrect) {
      return NextResponse.json({
        isCorrect: true,
        similarity: 1.0,
        feedback: 'Exactly right!',
      });
    }

    const prompt = `You are evaluating a student's answer to a flashcard question. Be fair but accurate.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Evaluate whether the student's answer is correct. Consider:
- Spelling variations and typos (minor typos should still be marked correct)
- Synonyms and equivalent phrasings
- Partial answers (if the core concept is there, give partial credit)

Respond with ONLY valid JSON:
{"isCorrect": true/false, "similarity": 0.0-1.0, "feedback": "brief explanation"}

Where similarity is: 1.0 = perfect match, 0.7-0.99 = essentially correct with minor differences, 0.4-0.69 = partially correct, 0.0-0.39 = incorrect.
Mark isCorrect as true if similarity >= 0.7.`;

    const result = await MODEL.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error('AI returned empty response');
    }

    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI evaluation');
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      isCorrect: Boolean(evaluation.isCorrect),
      similarity: Number(evaluation.similarity) || 0,
      feedback: String(evaluation.feedback || ''),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    Logger.error(LogContext.AI, 'Failed to evaluate answer', { error: msg });
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
