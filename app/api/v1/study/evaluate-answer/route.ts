import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { getModelForKeyType } from '@/lib/constants';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/study/evaluate-answer
 * AI-evaluates a typed answer against the correct answer.
 * Body: { userAnswer, correctAnswer, question? }
 * Counts as a generation call for quota purposes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  let body;
  try { body = await request.json(); } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { userAnswer, correctAnswer, question } = body as {
    userAnswer?: string; correctAnswer?: string; question?: string;
  };

  if (!userAnswer || !correctAnswer) {
    return apiError('INVALID_INPUT', requestId, undefined, 'userAnswer and correctAnswer are required.');
  }

  await dbConnect();

  // Quick exact match check
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  if (normalizedUser === normalizedCorrect) {
    return apiSuccess({ isCorrect: true, similarity: 1.0, feedback: 'Exact match.' }, { requestId });
  }

  // AI evaluation using the appropriate Gemini key
  try {
    const model = getModelForKeyType(context.keyType);
    const prompt = `Compare the user's answer to the correct answer. Consider spelling variations, synonyms, and partial correctness.
${question ? `Question: "${question}"` : ''}
Correct answer: "${correctAnswer}"
User's answer: "${userAnswer}"

Respond with ONLY a JSON object: {"isCorrect": boolean, "similarity": number (0.0-1.0), "feedback": "brief explanation"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return apiSuccess({ isCorrect: false, similarity: 0, feedback: 'Could not evaluate answer.' }, { requestId });
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    const isCorrect = evaluation.similarity >= 0.7;

    return apiSuccess({
      isCorrect,
      similarity: evaluation.similarity,
      feedback: evaluation.feedback || '',
    }, { requestId });
  } catch {
    return apiError('AI_GENERATION_FAILED', requestId, undefined, 'Answer evaluation failed.');
  }
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'study:write',
  isGenerationRoute: true, // Uses AI, counts against quota
});
