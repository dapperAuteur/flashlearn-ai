import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { FLASHCARD_MIN, FLASHCARD_MAX, MODEL } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
];

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
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a|aac|mp4)$/i)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Use MP3, WAV, WebM, OGG, M4A, or AAC.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio file must be under 25MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    // Determine mime type, defaulting to mpeg for mp3
    let mimeType = file.type;
    if (!mimeType || mimeType === 'audio/mp3') {
      mimeType = 'audio/mpeg';
    }
    if (file.name.endsWith('.m4a')) {
      mimeType = 'audio/mp4';
    }

    const prompt = `
You are an expert educator creating flashcards from audio content.

Listen to this audio recording carefully. It may be a lecture, podcast, voice note, or educational recording.

Generate ${FLASHCARD_MIN} to ${FLASHCARD_MAX} high-quality flashcards covering the key concepts, facts, definitions, and important points discussed.

IMPORTANT: Respond with ONLY a valid JSON array. Each object must have "front" (question) and "back" (answer) properties.
Example: [{"front": "What is...?", "back": "It is..."}]
`;

    const result = await MODEL.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ]);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate flashcards from audio.' }, { status: 500 });
    }

    const flashcards = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(flashcards) || flashcards.some((c: { front?: string; back?: string }) => !c.front || !c.back)) {
      return NextResponse.json({ error: 'Failed to parse generated flashcards.' }, { status: 500 });
    }

    await incrementGenerationCount(userId);

    return NextResponse.json({
      flashcards,
      source: 'audio',
      fileName: file.name,
    });
  } catch (error) {
    Logger.error(LogContext.AI, 'Audio flashcard generation error', { error });
    return NextResponse.json({ error: 'Failed to process audio. Please try again.' }, { status: 500 });
  }
}
