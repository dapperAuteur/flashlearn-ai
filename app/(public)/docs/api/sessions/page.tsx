import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sessions API',
  description: 'Schedule child-scoped review decks against curriculum standards. Honors IANA timezone for next-local-midnight delivery. Returns the canonical session.completed payload after results POST.',
  openGraph: {
    title: 'FlashLearn AI Sessions API',
    description: 'Schedule curriculum-tagged review decks for any consumer learning product.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function SessionsDocsPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Sessions</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-6">
        Two endpoints. The first schedules a curriculum-tagged review deck for a child. The second receives raw card attempts after the family plays the deck and returns the canonical session-completed payload synchronously.
      </p>

      <section aria-labelledby="post" className="mb-10">
        <h2 id="post" className="text-xl font-semibold text-gray-900 mt-8 mb-4">POST /api/v1/sessions</h2>
        <p className="text-gray-700">Generates a deck against the standards you pass, persists it, and schedules delivery for next local midnight in the supplied IANA timezone (defaults to UTC).</p>

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Request body</h3>
        <Code lang="json" code={`{
  "childId": "string (consumer-issued, opaque to FL-AI)",
  "ageBand": "4-7" | "8-12" | "13-18",
  "standards": [{ "framework": "indiana-k", "code": "K.NS.1" }],
  "sourceContext": {
    "consumer": "your-product-slug",
    "bookId": "optional",
    "hubId": "optional",
    "completedAt": "2026-04-26T19:00:00Z"
  },
  "tz": "America/Indiana/Indianapolis"
}`} />

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Response (201)</h3>
        <Code lang="json" code={`{
  "data": {
    "sessionId": "uuid-v4",
    "scheduledFor": "2026-04-27T05:00:00.000Z",
    "estimatedCardCount": 4
  },
  "meta": { "requestId": "req_..." }
}`} />

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Errors</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li><code>400 INVALID_INPUT</code> with <code>details.unknownStandards</code> if a standard code is not in the curriculum library.</li>
          <li><code>429 RATE_LIMIT_EXCEEDED</code> or <code>QUOTA_EXCEEDED</code> for tier limits.</li>
          <li><code>502 AI_GENERATION_FAILED</code> if Gemini errors. The session row is not created on failure; safe to retry.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-3">Counts as 1 generation + 1 API call against your monthly tier.</p>
      </section>

      <section aria-labelledby="results" className="mb-10">
        <h2 id="results" className="text-xl font-semibold text-gray-900 mt-8 mb-4">POST /api/v1/sessions/:sessionId/results</h2>
        <p className="text-gray-700">Submit attempts after the family plays the deck. The response body matches the webhook payload exactly so you can update UI without waiting for the round-trip. Treat the webhook as an audit confirmation.</p>

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Request body</h3>
        <Code lang="json" code={`{
  "cards": [
    {
      "cardId": "ObjectId hex string from the deck",
      "attempts": [
        {
          "isCorrect": true,
          "latencyMs": 4200,
          "attemptedAt": "2026-04-27T07:32:00Z",
          "confidenceRating": 4
        }
      ]
    }
  ]
}`} />

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Response (200)</h3>
        <Code lang="json" code={`{
  "data": {
    "type": "session.completed",
    "sessionId": "uuid-v4",
    "childId": "string",
    "completedAt": "2026-04-27T07:35:00Z",
    "cards": [
      {
        "cardId": "...",
        "standardCode": "K.NS.1",
        "correctOnFirstAttempt": true,
        "attempts": 1,
        "latencyMs": 4200
      }
    ]
  },
  "meta": { "requestId": "req_..." }
}`} />

        <p className="text-sm text-gray-600 mt-3">Idempotent on (sessionId, cardId, attemptNumber). Duplicate POSTs collapse cleanly. Counts as 1 API call, no generation.</p>
      </section>

      <section aria-labelledby="next" className="mt-12 grid sm:grid-cols-2 gap-4">
        <Link href="/docs/api/mastery" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Mastery API</span>
          <span className="block text-xs text-gray-500 mt-1">Per-standard rollup</span>
        </Link>
        <Link href="/docs/api/webhooks" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Webhook reference</span>
          <span className="block text-xs text-gray-500 mt-1">Signing, retry, replay</span>
        </Link>
      </section>
    </article>
  );
}
