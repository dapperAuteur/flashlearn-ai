import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ecosystem API: Sessions, Mastery & Cascade Delete',
  description: 'Build cross-product learning experiences with FlashLearn AI. Schedule child-scoped sessions, track per-standard mastery, dispatch signed webhooks, and honor COPPA delete requests. Indiana K and other curriculum frameworks supported.',
  openGraph: {
    title: 'FlashLearn AI Ecosystem API',
    description: 'Cross-product learning loops: scheduled sessions, mastery rollups, COPPA-compliant child data deletion.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function EcosystemDocsPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Ecosystem API</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-2">
        Drop FlashLearn AI in as the spaced-repetition + comprehension-measurement backend for any consumer-facing learning product.
      </p>
      <p className="text-sm text-gray-500 mb-8">
        Built for cross-product partners (consumer learning apps, classroom tools, curriculum platforms) that need scheduled review sessions, per-standard mastery tracking, and a real cascade-delete pathway. Used in production by <a href="https://wanderlearn.witus.online" className="text-blue-600 hover:underline" rel="noopener">Wanderlearn</a> (high school immersive 360-degree learning) and Better Vice Club classes (BAM&apos;s vice-engagement curriculum delivered via Centenarian Academy LMS).
      </p>

      <section aria-labelledby="when" className="mb-10">
        <h2 id="when" className="text-xl font-semibold text-gray-900 mt-8 mb-4">When to use this</h2>
        <p className="text-gray-700">Pick the Ecosystem API over the standard <Link href="/docs/api/generation" className="text-blue-600 hover:underline">Flashcard Generation</Link> + <Link href="/docs/api/spaced-repetition" className="text-blue-600 hover:underline">Spaced Repetition</Link> APIs when:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>Your users are children (you control consent; FL-AI never receives PII).</li>
          <li>You need to tag content to a curriculum standard (e.g. Indiana K math).</li>
          <li>You want signed webhook callbacks instead of polling for results.</li>
          <li>Parents/guardians have a privacy-rights workflow that may require deleting all of a child&apos;s data.</li>
        </ul>
      </section>

      <section aria-labelledby="key" className="mb-10">
        <h2 id="key" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Get an ecosystem key</h2>
        <p className="text-gray-700">Ecosystem keys are admin-issued (we vet the relationship + paperwork before turning them on). Email <a href="mailto:admin.flashlearnai@awews.com" className="text-blue-600 hover:underline">admin.flashlearnai@awews.com</a> with:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>Product name, URL, and one sentence on what you&apos;re building.</li>
          <li>Expected monthly volume (sessions + cards-per-session).</li>
          <li>Confirmation that you handle parental consent on your side per COPPA / GDPR-K.</li>
        </ul>
        <p className="text-gray-700 mt-3">You&apos;ll receive a key with prefix <code className="bg-gray-100 px-1 rounded text-xs">fl_eco_</code> and the <code className="bg-gray-100 px-1 rounded text-xs">kids:*</code> permission group (gates the four endpoints below plus generate).</p>
      </section>

      <section aria-labelledby="lifecycle" className="mb-10">
        <h2 id="lifecycle" className="text-xl font-semibold text-gray-900 mt-8 mb-4">The session lifecycle</h2>
        <ol className="list-decimal pl-6 text-gray-700 space-y-2">
          <li><strong>Child completes a hub / lesson on your platform.</strong> You POST <code className="bg-gray-100 px-1 rounded text-xs">/sessions</code> to schedule a review deck.</li>
          <li><strong>FL-AI generates a deck</strong> tagged to the standards you provided, persists it, and schedules next-day delivery in the timezone you specified.</li>
          <li><strong>The next day, your app serves the deck</strong> (you fetch it client-side using the sessionId).</li>
          <li><strong>The child plays.</strong> Your UI captures attempts.</li>
          <li><strong>You POST attempts to <code className="bg-gray-100 px-1 rounded text-xs">/sessions/:id/results</code>.</strong> The response is the canonical <code className="bg-gray-100 px-1 rounded text-xs">session.completed</code> payload, the same shape that fires via webhook. Your UI updates immediately on this response.</li>
          <li><strong>FL-AI dispatches the signed webhook</strong> to your registered URL as the audit confirmation.</li>
          <li><strong>You GET <code className="bg-gray-100 px-1 rounded text-xs">/mastery/:childId</code></strong> any time to render the parent dashboard.</li>
          <li><strong>If the parent invokes their delete right, you DELETE <code className="bg-gray-100 px-1 rounded text-xs">/children/:childId</code>.</strong> Cascades across every collection.</li>
        </ol>
      </section>

      <section aria-labelledby="endpoints" className="mb-10">
        <h2 id="endpoints" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Endpoints at a glance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="pb-2 pr-4 font-semibold text-gray-700">Method</th>
                <th scope="col" className="pb-2 pr-4 font-semibold text-gray-700">Path</th>
                <th scope="col" className="pb-2 font-semibold text-gray-700">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST</td><td className="py-2 pr-4 font-mono text-xs">/api/v1/sessions</td><td className="py-2">Schedule a deck for a known child.</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST</td><td className="py-2 pr-4 font-mono text-xs">/api/v1/sessions/:sessionId/results</td><td className="py-2">Submit attempts; receive canonical webhook payload synchronously.</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET</td><td className="py-2 pr-4 font-mono text-xs">/api/v1/mastery/:childId</td><td className="py-2">Per-standard rollup (exposed / practiced / demonstrated).</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">DELETE</td><td className="py-2 pr-4 font-mono text-xs">/api/v1/children/:childId</td><td className="py-2">COPPA cascade. Idempotent.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="create" className="mb-10">
        <h2 id="create" className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Schedule a session</h2>
        <Code lang="bash" code={`curl -X POST https://flashlearnai.witus.online/api/v1/sessions \\
  -H "Authorization: Bearer fl_eco_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "childId": "child-001",
    "ageBand": "4-7",
    "standards": [{"framework": "indiana-k", "code": "K.NS.1"}],
    "sourceContext": {
      "consumer": "your-app-name",
      "bookId": "alice",
      "hubId": "h1-descent",
      "completedAt": "2026-04-26T19:00:00Z"
    },
    "tz": "America/Indiana/Indianapolis"
  }'`} />
        <p className="text-gray-600 mt-3 text-sm">Response (201) returns <code className="bg-gray-100 px-1 rounded text-xs">{`{ sessionId, scheduledFor, estimatedCardCount }`}</code>. The <code className="bg-gray-100 px-1 rounded text-xs">tz</code> is optional but strongly recommended. Otherwise scheduledFor falls to UTC, which fires too early for non-UTC families.</p>
        <p className="text-gray-600 mt-2 text-sm"><strong>Counts as 1 generation + 1 API call.</strong> Unknown standards return <code className="bg-gray-100 px-1 rounded text-xs">400 INVALID_INPUT</code> with details.</p>
      </section>

      <section aria-labelledby="results" className="mb-10">
        <h2 id="results" className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Submit attempts</h2>
        <Code lang="bash" code={`curl -X POST https://flashlearnai.witus.online/api/v1/sessions/SESSION_ID/results \\
  -H "Authorization: Bearer fl_eco_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cards": [
      {
        "cardId": "5f8d0d55b54764421b7156c9",
        "attempts": [
          { "isCorrect": true, "latencyMs": 1500, "attemptedAt": "2026-04-27T13:00:00Z" }
        ]
      }
    ]
  }'`} />
        <p className="text-gray-600 mt-3 text-sm">Response (200) is the canonical <code className="bg-gray-100 px-1 rounded text-xs">session.completed</code> payload. Exactly the body that will arrive via webhook. Update your UI on this response. Treat the webhook as audit.</p>
        <p className="text-gray-600 mt-2 text-sm">Idempotent on <code className="bg-gray-100 px-1 rounded text-xs">(sessionId, cardId, attemptNumber)</code>. Retrying the POST after a network blip is safe.</p>
      </section>

      <section aria-labelledby="mastery" className="mb-10">
        <h2 id="mastery" className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Read the mastery rollup</h2>
        <Code lang="bash" code={`curl https://flashlearnai.witus.online/api/v1/mastery/child-001 \\
  -H "Authorization: Bearer fl_eco_YOUR_KEY"`} />
        <p className="text-gray-600 mt-3 text-sm">Returns <code className="bg-gray-100 px-1 rounded text-xs">{`{ childId, standards: [{ framework, code, state, firstAttemptCorrectRate, attemptCount, lastAttemptAt }] }`}</code>.</p>
        <p className="text-gray-600 mt-2 text-sm">State is one of: <code className="bg-gray-100 px-1 rounded text-xs">exposed</code> (session created), <code className="bg-gray-100 px-1 rounded text-xs">practiced</code> (at least one attempt), <code className="bg-gray-100 px-1 rounded text-xs">demonstrated</code> (≥80% correct over the last 5 first-attempts, sticky once reached). Returns 404 when the child has no rollup data, including after a cascade delete.</p>
      </section>

      <section aria-labelledby="delete" className="mb-10">
        <h2 id="delete" className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. COPPA cascade delete</h2>
        <Code lang="bash" code={`curl -X DELETE https://flashlearnai.witus.online/api/v1/children/child-001 \\
  -H "Authorization: Bearer fl_eco_YOUR_KEY"`} />
        <p className="text-gray-600 mt-3 text-sm">Returns <code className="bg-gray-100 px-1 rounded text-xs">{`{ deleted: true, purgedRecordCount: N }`}</code>. Cascades across sessions, attempts, mastery rollups, decks, and pending QStash jobs.</p>
        <p className="text-gray-600 mt-2 text-sm"><strong>Idempotency contract:</strong></p>
        <ul className="list-disc pl-6 text-gray-600 text-sm mt-1 space-y-0.5">
          <li>First call with data → <strong>200</strong> with N count.</li>
          <li>First call with no data → <strong>404</strong>.</li>
          <li>Re-call after a prior purge → <strong>200</strong> with <code className="bg-gray-100 px-1 rounded text-xs">purgedRecordCount: 0</code>.</li>
        </ul>
        <p className="text-gray-600 mt-2 text-sm">Subsequent <code className="bg-gray-100 px-1 rounded text-xs">GET /mastery/:childId</code> returns 404. Privacy rights are free. DELETE never counts against quota.</p>
      </section>

      <section aria-labelledby="standards" className="mb-10">
        <h2 id="standards" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Curriculum frameworks supported</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li><code className="bg-gray-100 px-1 rounded text-xs">indiana-k</code>: Indiana Academic Standards, Kindergarten (math + ELA, 14 codes)</li>
        </ul>
        <p className="text-gray-600 text-sm mt-2">Need another framework (Common Core, NGSS, state K-12, IB)? Email <a href="mailto:admin.flashlearnai@awews.com" className="text-blue-600 hover:underline">admin.flashlearnai@awews.com</a> with a CSV of <code className="bg-gray-100 px-1 rounded text-xs">code,title,description,ageBand</code> and we&apos;ll seed it.</p>
      </section>

      <nav aria-label="Related guides" className="mt-12 flex flex-col sm:flex-row gap-4">
        <Link href="/docs/api/webhooks" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Next: Outbound Webhooks</span>
          <span className="block text-xs text-gray-500 mt-1">Signature verification, retry policy, replay</span>
        </Link>
        <Link href="/docs/api/getting-started" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Reference: Getting Started</span>
          <span className="block text-xs text-gray-500 mt-1">Auth, errors, rate limits</span>
        </Link>
      </nav>
    </article>
  );
}
