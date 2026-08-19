import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { generateFlashcardsFromYouTube } from '@/lib/services/youtubeGeneration';

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
    const { url, prompt: rawPrompt } = await request.json();

    const result = await generateFlashcardsFromYouTube({ url, rawPrompt });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.code === 'NO_CARDS' ? 500 : 400 },
      );
    }

    await incrementGenerationCount(userId);

    return NextResponse.json({
      flashcards: result.flashcards,
      source: 'youtube',
      videoId: result.videoId,
      transcriptLength: result.transcriptLength,
    });
  } catch (error) {
    Logger.error(LogContext.AI, 'YouTube flashcard generation error', { error });
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      return NextResponse.json({ error: 'Gemini API rate limit reached. Please wait a moment and try again.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Failed to process YouTube video. Please try again.' }, { status: 500 });
  }
}
