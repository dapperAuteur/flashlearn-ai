import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { FLASHCARD_MIN, FLASHCARD_MAX } from '@/lib/constants';
import { generateFlashcards } from '@/lib/ai/generate';
import { Logger, LogContext } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { YoutubeTranscript } from 'youtube-transcript';
import {
  buildSourcePrompt,
  sanitizeUserInstructions,
  MAX_USER_INSTRUCTIONS_LENGTH,
} from '@/lib/services/buildGenerationPrompt';

const MAX_TRANSCRIPT_LENGTH = 50000;

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

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

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    if (typeof rawPrompt === 'string' && rawPrompt.trim().length > MAX_USER_INSTRUCTIONS_LENGTH) {
      return NextResponse.json(
        { error: `Instructions must be ${MAX_USER_INSTRUCTIONS_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }
    const userInstructions = sanitizeUserInstructions(rawPrompt);

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    let transcriptItems;
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch {
      return NextResponse.json(
        { error: 'Could not fetch transcript. The video may not have captions available.' },
        { status: 400 },
      );
    }

    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json(
        { error: 'No transcript available for this video.' },
        { status: 400 },
      );
    }

    let transcript = transcriptItems.map((item) => item.text).join(' ');

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      transcript = transcript.substring(0, MAX_TRANSCRIPT_LENGTH);
    }

    const prompt = buildSourcePrompt({
      sourceKind: 'youtube',
      body: transcript,
      userInstructions,
      min: FLASHCARD_MIN,
      max: FLASHCARD_MAX,
    });

    const flashcards = await generateFlashcards({ prompt });
    if (flashcards.length === 0) {
      return NextResponse.json({ error: 'Failed to generate flashcards from transcript.' }, { status: 500 });
    }

    await incrementGenerationCount(userId);

    return NextResponse.json({
      flashcards,
      source: 'youtube',
      videoId,
      transcriptLength: transcript.length,
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
