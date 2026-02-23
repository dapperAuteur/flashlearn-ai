import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { FLASHCARD_MIN, FLASHCARD_MAX, MODEL } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB per image
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (files.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed` }, { status: 400 });
    }

    // Validate and convert images to inline data
    const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${file.type}. Use JPEG, PNG, WebP, or GIF.` },
          { status: 400 },
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Each image must be under 10MB' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      imageParts.push({
        inlineData: { data: base64, mimeType: file.type },
      });
    }

    const prompt = `
You are an expert educator creating flashcards from image content.

Look at the provided image(s) carefully. They may contain:
- Textbook pages, lecture slides, or handwritten notes
- Diagrams, charts, or tables
- Whiteboard content or screenshots

Extract the key educational content and generate ${FLASHCARD_MIN} to ${FLASHCARD_MAX} high-quality flashcards covering the main concepts, definitions, facts, and relationships shown.

IMPORTANT: Respond with ONLY a valid JSON array. Each object must have "front" (question) and "back" (answer) properties.
Example: [{"front": "What is...?", "back": "It is..."}]
`;

    const result = await MODEL.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate flashcards from images.' }, { status: 500 });
    }

    const flashcards = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(flashcards) || flashcards.some((c: { front?: string; back?: string }) => !c.front || !c.back)) {
      return NextResponse.json({ error: 'Failed to parse generated flashcards.' }, { status: 500 });
    }

    await incrementGenerationCount(userId);

    return NextResponse.json({
      flashcards,
      source: 'image',
      imageCount: files.length,
    });
  } catch (error) {
    Logger.error(LogContext.AI, 'Image flashcard generation error', { error });
    return NextResponse.json({ error: 'Failed to process images. Please try again.' }, { status: 500 });
  }
}
