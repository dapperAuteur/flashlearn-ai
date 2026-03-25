export const BASE_URL = 'https://flashlearnai.witus.online';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FlashLearnAI',
    url: BASE_URL,
    logo: `${BASE_URL}/icon-512.png`,
    description: 'AI-powered flashcard creation and multiplayer study challenges',
    parentOrganization: {
      '@type': 'Organization',
      name: 'WitUS.Online',
      url: 'https://witus.online',
    },
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FlashLearn AI',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: BASE_URL,
    description: 'AI-powered flashcard creation and multiplayer study challenges. Generate flashcards from text, PDFs, YouTube, audio, and images.',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier with 3 AI-generated sets per month',
      },
      {
        '@type': 'Offer',
        price: '10.00',
        priceCurrency: 'USD',
        description: 'Monthly Pro with unlimited AI generation',
      },
      {
        '@type': 'Offer',
        price: '100.00',
        priceCurrency: 'USD',
        description: 'Lifetime Learner — one-time payment',
      },
    ],
    provider: {
      '@type': 'Organization',
      name: 'FlashLearnAI',
      url: BASE_URL,
    },
  };
}

export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function blogPostSchema({
  title,
  date,
  author,
  excerpt,
  slug,
}: {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: date,
    author: {
      '@type': 'Person',
      name: author,
    },
    description: excerpt,
    url: `${BASE_URL}/blog/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'FlashLearnAI',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icon-512.png`,
      },
    },
  };
}

export function profilePageSchema({
  name,
  username,
  bio,
}: {
  name: string;
  username: string;
  bio?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      identifier: username,
      description: bio || `${name}'s profile on FlashLearn AI`,
      url: `${BASE_URL}/u/${username}`,
    },
  };
}

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
      name: 'FlashLearnAI.WitUS.Online',
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
      name: 'FlashLearnAI.WitUS.Online',
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
    name: 'FlashLearnAI.WitUS.Online — Public Challenge Archive',
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
      name: 'FlashLearnAI.WitUS.Online',
      url: BASE_URL,
    },
  };
}
