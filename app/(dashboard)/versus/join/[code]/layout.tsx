import type { Metadata } from 'next';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge } from '@/models/Challenge';
import { versusEventSchema } from '@/lib/structured-data';

interface ChallengePreview {
  setName: string;
  cardCount: number;
  maxParticipants: number;
  participantCount: number;
  status: string;
}

async function getChallengePreview(code: string): Promise<ChallengePreview | null> {
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
      status: challenge.status,
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

  if (!challenge) {
    return { title: 'Versus Challenge | FlashLearnAI.WitUS.Online' };
  }

  const upperCode = code.toUpperCase();
  const { setName: topic, cardCount, maxParticipants, participantCount } = challenge;
  const ogImageUrl = `/api/og?type=versus&code=${upperCode}&topic=${encodeURIComponent(topic)}&participants=${participantCount}&max=${maxParticipants}&cards=${cardCount}`;
  const title = `Join "${topic}" — Flashcard Challenge`;
  const description = `${participantCount}/${maxParticipants} players joined. Can you beat them on ${cardCount} cards? Use code ${upperCode}.`;

  return {
    title,
    description,
    alternates: { canonical: `/versus/join/${code}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/versus/join/${code}`,
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

export default async function VersusJoinLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const challenge = await getChallengePreview(code);

  const structuredData = challenge
    ? versusEventSchema({
        topic: challenge.setName,
        code: code.toUpperCase(),
        maxParticipants: challenge.maxParticipants,
        url: `/versus/join/${code}`,
      })
    : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      {children}
    </>
  );
}
