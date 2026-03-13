import type { Metadata } from 'next';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge } from '@/models/Challenge';

async function getChallengePreview(code: string) {
  try {
    await dbConnect();
    const challenge = await Challenge.findOne({ challengeCode: code.toUpperCase() })
      .select('setName cardCount maxParticipants participants status')
      .lean() as {
        setName: string;
        cardCount: number;
        maxParticipants: number;
        participants: unknown[];
        status: string;
      } | null;

    if (!challenge || challenge.status === 'expired') return null;
    return {
      setName: challenge.setName,
      cardCount: challenge.cardCount,
      maxParticipants: challenge.maxParticipants,
      participantCount: challenge.participants?.length ?? 1,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const challenge = await getChallengePreview(code);

  if (!challenge) return { title: 'Flashcard Challenge | FlashLearn AI' };

  const { setName, cardCount, maxParticipants, participantCount } = challenge;
  const upperCode = code.toUpperCase();
  const ogImageUrl = `/api/og?type=versus&code=${upperCode}&topic=${encodeURIComponent(setName)}&participants=${participantCount}&max=${maxParticipants}&cards=${cardCount}`;
  const title = `Join "${setName}" — Flashcard Challenge`;
  const description = `${participantCount}/${maxParticipants} players joined. Can you beat them on ${cardCount} cards? Use code ${upperCode}.`;

  return {
    title,
    description,
    alternates: { canonical: `/versus/preview/${code}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/versus/preview/${code}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ChallengePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
