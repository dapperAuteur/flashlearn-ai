import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Spaced Repetition API',
  description: 'Build a study app with the FlashLearn SM-2 spaced repetition API. Due cards, study sessions, AI answer evaluation, and per-card analytics.',
  openGraph: {
    title: 'FlashLearn Spaced Repetition (SM-2) API Guide',
    description: 'The same algorithm behind Anki, now available as an API. React example included.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} code example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function SpacedRepetitionPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Spaced Repetition (SM-2)</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        The same algorithm behind Anki, available as an API. Build study apps with scientifically-optimal review scheduling.
      </p>

      <section aria-labelledby="how-sm2">
        <h2 id="how-sm2" className="text-xl font-semibold text-gray-900 mt-8 mb-4">How SM-2 Works</h2>
        <p className="text-gray-600 mb-3">Each card tracks four values that determine when it appears next:</p>
        <ul className="text-gray-600 space-y-1 list-disc pl-5 text-sm">
          <li><strong>Easiness Factor</strong> (2.5 default) — How easy this card is. Drops on wrong answers.</li>
          <li><strong>Interval</strong> — Days until next review. Grows exponentially: 1 → 6 → 6 x EF → ...</li>
          <li><strong>Repetitions</strong> — Consecutive correct answers. Resets to 0 on any mistake.</li>
          <li><strong>Next Review Date</strong> — When this card should next appear.</li>
        </ul>
      </section>

      <section aria-labelledby="workflow">
        <h2 id="workflow" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Study Workflow</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">1. Check due cards</h3>
        <Code code={`curl https://flashlearnai.witus.online/api/v1/study/due-cards \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY"

# Response: { "data": { "sets": [{ "setId": "abc", "setName": "Biology", "dueCount": 8 }], "totalDue": 8 } }`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2. Get review schedule</h3>
        <Code code={`curl https://flashlearnai.witus.online/api/v1/study/due-cards/schedule \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY"

# Response: { "data": { "today": 8, "tomorrow": 3, "thisWeek": 15, "next14Days": [...] } }`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3. Start a study session</h3>
        <Code lang="json" code={`POST /api/v1/study/sessions
{
  "setId": "abc123",
  "studyMode": "classic",       // or "type-answer", "multiple-choice"
  "studyDirection": "front-to-back"
}

// Returns: sessionId + shuffled flashcards`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">4. (Optional) AI answer evaluation</h3>
        <Code lang="json" code={`POST /api/v1/study/evaluate-answer
{
  "userAnswer": "mitocondria",
  "correctAnswer": "Mitochondria",
  "question": "What organelle produces ATP?"
}

// Returns: { "isCorrect": true, "similarity": 0.95, "feedback": "Correct! Minor spelling variation." }`} />
        <p className="text-sm text-gray-500 mt-2">Handles typos, synonyms, partial answers. Counts as a generation call.</p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5. Complete the session</h3>
        <Code lang="json" code={`POST /api/v1/study/sessions/{sessionId}/complete
{
  "results": [
    { "cardId": "card1", "isCorrect": true, "timeSeconds": 4.2, "confidenceRating": 5 },
    { "cardId": "card2", "isCorrect": false, "timeSeconds": 12.1, "confidenceRating": 2 }
  ]
}

// SM-2 automatically reschedules each card based on results
// Returns: accuracy %, correctCount, durationSeconds`} />
        <p className="text-sm text-gray-500 mt-2">Confidence ratings (1-5) affect the SM-2 quality score. A lucky guess (1) scores worse than a confident correct answer (5).</p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">6. View analytics</h3>
        <Code code={`curl https://flashlearnai.witus.online/api/v1/study/analytics/SET_ID \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY"

# Returns per-card: easinessFactor, interval, repetitions, nextReviewDate, correctCount, confidence`} />
      </section>

      <section aria-labelledby="endpoints">
        <h2 id="endpoints" className="text-xl font-semibold text-gray-900 mt-10 mb-4">All Study Endpoints</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Endpoint</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">Description</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /study/due-cards</td><td className="py-2">Cards due for review</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /study/due-cards/schedule</td><td className="py-2">14-day review forecast</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /study/sessions</td><td className="py-2">Start session (shuffled cards)</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /study/sessions/:id/complete</td><td className="py-2">Submit results</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /study/evaluate-answer</td><td className="py-2">AI answer check</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">GET /study/analytics/:setId</td><td className="py-2">Per-card SM-2 analytics</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <nav aria-label="Next guides" className="mt-12 flex flex-col sm:flex-row gap-4">
        <Link href="/docs/api/generation" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Prev: Flashcard Generation</span>
          <span className="block text-xs text-gray-500 mt-1">Generate, batch, manage sets</span>
        </Link>
        <Link href="/docs/api/versus-mode" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Next: Versus Mode</span>
          <span className="block text-xs text-gray-500 mt-1">Competitive challenges and scoring</span>
        </Link>
      </nav>
    </article>
  );
}
