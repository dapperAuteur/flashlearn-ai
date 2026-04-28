import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mastery API',
  description: 'Per-standard rollup of a child\'s progress. Three states: exposed, practiced, demonstrated. Sticky promotion at 80 percent first-attempt correct over the last 5 attempts.',
  openGraph: {
    title: 'FlashLearn AI Mastery API',
    description: 'Per-standard mastery rollup for ecosystem partners.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function MasteryDocsPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Mastery</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-6">
        A child&apos;s standard-by-standard progress. Built for parent dashboards, teacher reports, and downstream analytics. Returns 404 once a cascade-delete has run.
      </p>

      <section aria-labelledby="get" className="mb-10">
        <h2 id="get" className="text-xl font-semibold text-gray-900 mt-8 mb-4">GET /api/v1/mastery/:childId</h2>

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Response (200)</h3>
        <Code lang="json" code={`{
  "data": {
    "childId": "string",
    "standards": [
      {
        "framework": "indiana-k",
        "code": "K.NS.1",
        "state": "exposed" | "practiced" | "demonstrated",
        "firstAttemptCorrectRate": 0.83,
        "attemptCount": 12,
        "lastAttemptAt": "2026-04-27T07:35:00Z"
      }
    ]
  },
  "meta": { "requestId": "req_..." }
}`} />
      </section>

      <section aria-labelledby="states" className="mb-10">
        <h2 id="states" className="text-xl font-semibold text-gray-900 mt-8 mb-4">State transitions</h2>
        <p className="text-gray-700">Three states. Promotion is sticky once reached; a child cannot regress.</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-3">
          <li><strong>exposed</strong> — at least one session created against this standard.</li>
          <li><strong>practiced</strong> — at least one card attempted on this standard.</li>
          <li><strong>demonstrated</strong> — first-attempt correct rate is at least 80 percent over the last 5 first-attempts.</li>
        </ul>
      </section>

      <section aria-labelledby="errors" className="mb-10">
        <h2 id="errors" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Errors</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li><code>404 NOT_FOUND</code> if the child has no rollup data, including after a cascade-delete.</li>
          <li><code>401 / 403</code> from the standard auth middleware.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-3">Counts as 1 API call, no generation.</p>
      </section>

      <section aria-labelledby="next" className="mt-12 grid sm:grid-cols-2 gap-4">
        <Link href="/docs/api/sessions" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Sessions API</span>
          <span className="block text-xs text-gray-500 mt-1">Schedule + submit results</span>
        </Link>
        <Link href="/docs/api/children" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Children API</span>
          <span className="block text-xs text-gray-500 mt-1">COPPA cascade-delete</span>
        </Link>
      </section>
    </article>
  );
}
