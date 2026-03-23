/**
 * SEO CONFIGURATION
 *
 * Edit this file to customize page titles, descriptions, and Open Graph tags.
 * Or use the visual editor at /admin/seo after deploying.
 */
export const seoConfig: Record<string, { title: string; description: string; ogTitle?: string; ogDescription?: string }> = {
  '/': {
    title: 'Home',
    description: 'AI-powered flashcard generation, spaced repetition, and competitive learning.',
    ogTitle: 'Learn smarter with AI flashcards',
    ogDescription: 'Generate flashcards from any topic. Study with spaced repetition. Challenge friends.',
  },
  '/generate': {
    title: 'Generate Flashcards',
    description: 'Create AI-powered flashcards from any topic in seconds.',
  },
  '/sets': {
    title: 'My Flashcard Sets',
    description: 'View and manage your flashcard collections.',
  },
  '/explore': {
    title: 'Explore Public Sets',
    description: 'Browse flashcard sets created by the community. Search by topic or category.',
  },
  '/study': {
    title: 'Study',
    description: 'Review flashcards with scientifically-optimized spaced repetition scheduling.',
  },
  '/evaluate': {
    title: 'AI Answer Evaluator',
    description: 'Check typed answers with AI that understands typos, synonyms, and context.',
  },
  '/versus': {
    title: 'Versus Mode',
    description: 'Compete with friends in flashcard challenges. Scored on accuracy, speed, confidence, and streak.',
  },
  '/versus/create': {
    title: 'Create Challenge',
    description: 'Start a new flashcard challenge and invite friends with a shareable code.',
  },
  '/versus/join': {
    title: 'Join Challenge',
    description: 'Enter a challenge code to join a flashcard quiz battle.',
  },
  '/versus/stats': {
    title: 'My Versus Stats',
    description: 'Track your win/loss record, ELO rating, and composite scores.',
  },
  '/usage': {
    title: 'API Usage',
    description: 'Monitor your API call usage, generation counts, and billing period.',
  },
};
