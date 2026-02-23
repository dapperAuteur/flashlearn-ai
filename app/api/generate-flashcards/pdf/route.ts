import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { FLASHCARD_MIN, FLASHCARD_MAX, MODEL } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { PDFParse } from 'pdf-parse';

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TEXT_LENGTH = 50000; // chars to send to Gemini

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const userId = session.user.id;

  const { limited, reason } = await checkRateLimit(userId);
  if (limited) {
    return NextResponse.json({ error: 'Too Many Requests', message: reason }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: 'PDF must be under 20MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    await parser.destroy();
    let text = textResult.text?.trim();
    const pageCount = textResult.total || 0;

    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: 'Could not extract enough text from this PDF. It may be image-based — try the Image upload instead.' },
        { status: 400 },
      );
    }

    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    const prompt = `
You are an expert educator creating flashcards from document content.

Based on the following text extracted from a PDF, generate ${FLASHCARD_MIN} to ${FLASHCARD_MAX} high-quality flashcards.
Focus on the key concepts, definitions, facts, and important relationships in the content.

TEXT:
"""
${text}
"""

IMPORTANT: Respond with ONLY a valid JSON array. Each object must have "front" (question) and "back" (answer) properties.
Example: [{"front": "What is...?", "back": "It is..."}]
`;

    const result = await MODEL.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate flashcards from PDF content.' }, { status: 500 });
    }

    const flashcards = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(flashcards) || flashcards.some((c: { front?: string; back?: string }) => !c.front || !c.back)) {
      return NextResponse.json({ error: 'Failed to parse generated flashcards.' }, { status: 500 });
    }

    await incrementGenerationCount(userId);

    return NextResponse.json({
      flashcards,
      source: 'pdf',
      pageCount,
      textLength: text.length,
    });
  } catch (error) {
    Logger.error(LogContext.AI, 'PDF flashcard generation error', { error });
    return NextResponse.json({ error: 'Failed to process PDF. Please try again.' }, { status: 500 });
  }
}
