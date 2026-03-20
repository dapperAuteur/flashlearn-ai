import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { VersusTemplate, ResultsTemplate, SetTemplate } from '@/lib/og/templates';
import { IMAGE_WIDTH, IMAGE_HEIGHT } from '@/lib/og/styles';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');

  try {
    if (type === 'versus') {
      const code = searchParams.get('code') ?? '';
      const topic = searchParams.get('topic') ?? 'Flashcard Challenge';
      const participantCount = parseInt(searchParams.get('participants') ?? '1', 10);
      const maxParticipants = parseInt(searchParams.get('max') ?? '2', 10);
      const cardCount = parseInt(searchParams.get('cards') ?? '0', 10);

      return new ImageResponse(
        VersusTemplate({ topic, code, participantCount, maxParticipants, cardCount }),
        { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }
      );
    }

    if (type === 'results') {
      const setName = searchParams.get('set') ?? 'Flashcard Set';
      const accuracy = parseInt(searchParams.get('accuracy') ?? '0', 10);
      const correct = parseInt(searchParams.get('correct') ?? '0', 10);
      const total = parseInt(searchParams.get('total') ?? '0', 10);
      const durationLabel = searchParams.get('duration') ?? '';

      return new ImageResponse(
        ResultsTemplate({ setName, accuracy, correct, total, durationLabel }),
        { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }
      );
    }

    if (type === 'set') {
      const title = searchParams.get('title') ?? 'Flashcard Set';
      const description = searchParams.get('description') ?? '';
      const cardCount = parseInt(searchParams.get('cards') ?? '0', 10);

      return new ImageResponse(
        SetTemplate({ title, description, cardCount }),
        { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }
      );
    }

    // Default fallback
    return new ImageResponse(
      SetTemplate({ title: 'FlashLearnAI.WitUS.Online', description: 'AI-powered flashcard study', cardCount: 0 }),
      { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }
    );
  } catch {
    return new Response('Failed to generate image', { status: 500 });
  }
}
