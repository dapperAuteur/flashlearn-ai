import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Children API (COPPA Delete)',
  description: 'Single-call cascade-delete for child-derived data. Idempotent. Audit-logged. End-to-end test in CI. Designed for COPPA / GDPR-K parental delete-right workflows.',
  openGraph: {
    title: 'FlashLearn AI Children API',
    description: 'COPPA cascade-delete for ecosystem partners.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function ChildrenDocsPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Children</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-6">
        One endpoint. Purges every byte of child-derived data across five collections. Cancels pending QStash work. Writes a permanent audit-log row. Idempotent.
      </p>

      <section aria-labelledby="delete" className="mb-10">
        <h2 id="delete" className="text-xl font-semibold text-gray-900 mt-8 mb-4">DELETE /api/v1/children/:childId</h2>

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Response (200)</h3>
        <Code lang="json" code={`{
  "data": { "deleted": true, "purgedRecordCount": 47 },
  "meta": { "requestId": "req_..." }
}`} />

        <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">Idempotency contract</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>First call, child has data: <code>200</code> with the purge count.</li>
          <li>First call, child has no data: <code>404 NOT_FOUND</code>. We never recorded data for this id.</li>
          <li>Re-call after a prior purge: <code>200</code> with <code>purgedRecordCount: 0</code>. The audit-log row from the first call satisfies the idempotency check.</li>
        </ul>
      </section>

      <section aria-labelledby="cascade" className="mb-10">
        <h2 id="cascade" className="text-xl font-semibold text-gray-900 mt-8 mb-4">What gets purged</h2>
        <p className="text-gray-700">Order matters. Webhooks first so we never POST data for a child mid-deletion.</p>
        <ol className="list-decimal pl-6 text-gray-700 space-y-1 mt-2">
          <li>Cancel pending QStash messages (next-day deck deliveries, in-flight webhook retries).</li>
          <li>Delete <code>WebhookDelivery</code> rows for this child.</li>
          <li>Delete <code>CardAttempt</code> rows.</li>
          <li>Delete <code>MasteryRollup</code> rows.</li>
          <li>Delete child-derived <code>FlashcardSet</code> rows (the deck content, since cards may quote child input).</li>
          <li>Delete <code>EcosystemSession</code> rows.</li>
          <li>Insert a <code>CascadePurgeLog</code> row (request id, requester ip, timestamp, per-collection counts).</li>
        </ol>
      </section>

      <section aria-labelledby="audit" className="mb-10">
        <h2 id="audit" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Audit trail</h2>
        <p className="text-gray-700">Every cascade-delete writes a <code>CascadePurgeLog</code> row. The row is append-only and persists indefinitely as a compliance receipt. K-12 procurement reviewers can ask us to query it for their tenant.</p>
        <p className="text-gray-700 mt-3">A subsequent <code>GET /api/v1/mastery/:childId</code> returns 404. This is asserted in the COPPA cascade end-to-end test that runs in CI on every PR.</p>
      </section>

      <section aria-labelledby="quota" className="mb-10">
        <h2 id="quota" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Quota</h2>
        <p className="text-gray-700">Counts as 1 API call. Does not count as a generation. We do not charge for invoking a privacy right.</p>
      </section>

      <section aria-labelledby="next" className="mt-12 grid sm:grid-cols-2 gap-4">
        <Link href="/docs/api/sessions" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Sessions API</span>
          <span className="block text-xs text-gray-500 mt-1">Schedule + submit results</span>
        </Link>
        <Link href="/docs/api/mastery" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Mastery API</span>
          <span className="block text-xs text-gray-500 mt-1">Per-standard rollup</span>
        </Link>
      </section>
    </article>
  );
}
