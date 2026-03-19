export const BASE_URL = 'https://www.flashlearn-ai.com';

export function versusEventSchema({
  topic,
  code,
  maxParticipants,
  url,
}: {
  topic: string;
  code: string;
  maxParticipants: number;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Flashcard Challenge: ${topic}`,
    description: `Multiplayer flashcard challenge with up to ${maxParticipants} players. Join with code ${code}.`,
    url: `${BASE_URL}${url}`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'FlashLearn AI',
      url: BASE_URL,
    },
  };
}

export function studyResultsSchema({
  setName,
  accuracy,
  correct,
  total,
  url,
}: {
  setName: string;
  accuracy: number;
  correct: number;
  total: number;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${accuracy}% on ${setName}`,
    description: `Study session results: ${correct} of ${total} cards correct on ${setName}.`,
    url: `${BASE_URL}${url}`,
    publisher: {
      '@type': 'Organization',
      name: 'FlashLearn AI',
      url: BASE_URL,
    },
  };
}

export function challengeArchiveSchema({
  challenges,
  url,
}: {
  challenges: { _id: string; setName: string; topScore: number; completedCount: number }[];
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FlashLearn AI — Public Challenge Archive',
    description: 'Browse completed multiplayer flashcard challenges. See rankings, top scores, and join the competition.',
    url: `${BASE_URL}${url}`,
    numberOfItems: challenges.length,
    itemListElement: challenges.map((ch, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${ch.setName} Challenge`,
      description: `Top score: ${ch.topScore} · ${ch.completedCount} player${ch.completedCount !== 1 ? 's' : ''}`,
      url: `${BASE_URL}/versus/board/${ch._id}`,
    })),
  };
}

export function flashcardSetSchema({
  title,
  description,
  cardCount,
  url,
}: {
  title: string;
  description: string;
  cardCount: number;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: description || `Study ${cardCount} flashcards on ${title}.`,
    url: `${BASE_URL}${url}`,
    numberOfCredits: cardCount,
    provider: {
      '@type': 'Organization',
      name: 'FlashLearn AI',
      url: BASE_URL,
    },
  };
}
