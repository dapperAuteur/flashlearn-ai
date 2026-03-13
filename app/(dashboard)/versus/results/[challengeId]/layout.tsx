import type { Metadata } from 'next';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge } from '@/models/Challenge';
import { versusEventSchema } from '@/lib/structured-data';

interface ChallengeResultsPreview {
  setName: string;
  challengeCode: string;
  participantCount: number;
  completedCount: number;
  status: string;
}

async function getResultsPreview(challengeId: string): Promise<ChallengeResultsPreview | null> {
  try {
    await dbConnect();
    const challenge = await Challenge.findById(challengeId)
      .select('setName challengeCode participants status')
      .lean() as {
        setName: string;
        challengeCode: string;
        participants: { status: string }[];
        status: string;
      } | null;

    if (!challenge) return null;

    return {
      setName: challenge.setName,
      challengeCode: challenge.challengeCode,
      participantCount: challenge.participants?.length ?? 0,
      completedCount: challenge.participants?.filter((p) => p.status === 'completed').length ?? 0,
      status: challenge.status,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}): Promise<Metadata> {
  const { challengeId } = await params;
  const challenge = await getResultsPreview(challengeId);

  if (!challenge) {
    return { title: 'Versus Results | FlashLearn AI' };
  }

  const { setName, challengeCode, participantCount, completedCount } = challenge;
  const ogImageUrl = `/api/og?type=versus&code=${challengeCode}&topic=${encodeURIComponent(setName)}&participants=${completedCount}&max=${participantCount}&cards=0`;
  const title = `Versus Results: ${setName}`;
  const description = `See how ${completedCount} of ${participantCount} players scored on the "${setName}" flashcard challenge.`;

  return {
    title,
    description,
    alternates: { canonical: `/versus/results/${challengeId}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/versus/results/${challengeId}`,
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

export default async function VersusResultsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const challenge = await getResultsPreview(challengeId);

  const structuredData = challenge
    ? versusEventSchema({
        topic: challenge.setName,
        code: challenge.challengeCode,
        maxParticipants: challenge.participantCount,
        url: `/versus/results/${challengeId}`,
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
