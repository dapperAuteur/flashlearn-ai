import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Outbound Webhooks: Signed Delivery & Retries',
  description: 'How FlashLearn AI signs and delivers session.completed webhooks, the retry schedule, and how to verify HMAC signatures on your endpoint.',
  openGraph: {
    title: 'FlashLearn AI Webhooks Reference',
    description: 'HMAC-SHA256 signed payloads, exponential backoff, dead-letter dashboard.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function WebhooksDocsPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Outbound Webhooks</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        Receive signed, retried, idempotent event callbacks from FlashLearn AI on a URL you control.
      </p>

      <section aria-labelledby="when" className="mb-10">
        <h2 id="when" className="text-xl font-semibold text-gray-900 mt-8 mb-4">What you receive</h2>
        <p className="text-gray-700">Today the only event is <code className="bg-gray-100 px-1 rounded text-xs">session.completed</code>, fired after a child finishes a deck created via the <Link href="/docs/api/ecosystem" className="text-blue-600 hover:underline">Ecosystem API</Link>. The body matches the response of <code className="bg-gray-100 px-1 rounded text-xs">POST /sessions/:id/results</code> exactly. The webhook is your audit / source-of-truth confirmation, not new information.</p>
      </section>

      <section aria-labelledby="register" className="mb-10">
        <h2 id="register" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Register an endpoint</h2>
        <p className="text-gray-700">Visit <Link href="/developer/webhooks" className="text-blue-600 hover:underline">/developer/webhooks</Link>, click <strong>New Endpoint</strong>, paste your https URL, and we&apos;ll generate a signing secret. <strong>Save the plaintext secret immediately.</strong> It&apos;s shown once. You can rotate it any time from the same dashboard, but the new secret takes effect immediately so update your verification key first.</p>
        <p className="text-gray-600 text-sm mt-2">Up to 5 endpoints per API key. Set the URL on a sub-route you can isolate (e.g. <code className="bg-gray-100 px-1 rounded text-xs">/api/flashlearn/webhook</code>) so you don&apos;t mix it with anything else.</p>
      </section>

      <section aria-labelledby="payload" className="mb-10">
        <h2 id="payload" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Payload</h2>
        <Code lang="json" code={`{
  "type": "session.completed",
  "sessionId": "uuid-v4",
  "childId": "child-001",
  "completedAt": "2026-04-27T13:05:00Z",
  "cards": [
    {
      "cardId": "5f8d0d55b54764421b7156c9",
      "standardCode": "K.NS.1",
      "correctOnFirstAttempt": true,
      "attempts": 1,
      "latencyMs": 1500
    }
  ]
}`} />
      </section>

      <section aria-labelledby="headers" className="mb-10">
        <h2 id="headers" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Headers</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="pb-2 pr-4 font-semibold text-gray-700">Header</th>
                <th scope="col" className="pb-2 font-semibold text-gray-700">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">Content-Type: application/json</td><td className="py-2">Fixed.</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-FlashLearn-Signature</td><td className="py-2"><code className="bg-gray-100 px-1 rounded text-xs">sha256=&lt;hex&gt;</code>. HMAC-SHA256 of the raw request body using your signing secret.</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-FlashLearn-Delivery</td><td className="py-2">UUID. Same value across retries. Dedupe on this.</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-FlashLearn-Event</td><td className="py-2">e.g. <code className="bg-gray-100 px-1 rounded text-xs">session.completed</code></td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-FlashLearn-Timestamp</td><td className="py-2">Unix seconds at signing time. Use for replay protection (recommend rejecting requests &gt; 5 min old).</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">User-Agent: FlashLearn-Webhooks/2.0</td><td className="py-2">Distinguishes new dispatcher from legacy milestone hooks (1.0).</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="verify" className="mb-10">
        <h2 id="verify" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Verifying the signature</h2>
        <p className="text-gray-700">Compute HMAC-SHA256 of the <strong>raw body bytes</strong> (not the parsed JSON) using your stored secret. Compare to the header in constant time.</p>
        <Code lang="javascript" code={`// Node.js / Next.js route handler
import crypto from 'node:crypto';

export async function POST(req) {
  const rawBody = await req.text();           // BEFORE JSON.parse
  const received = req.headers.get('x-flashlearn-signature') || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.FLASHLEARN_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (received.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    return new Response('invalid signature', { status: 401 });
  }

  // Replay protection: reject anything older than 5 minutes
  const ts = parseInt(req.headers.get('x-flashlearn-timestamp') || '0', 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response('stale signature', { status: 401 });
  }

  // Idempotency: record deliveryId, skip if already processed
  const deliveryId = req.headers.get('x-flashlearn-delivery');
  if (await alreadyProcessed(deliveryId)) {
    return new Response('ok (dedup)', { status: 200 });
  }

  const event = JSON.parse(rawBody);
  await processEvent(event);
  return new Response('ok', { status: 200 });
}`} />
      </section>

      <section aria-labelledby="retry" className="mb-10">
        <h2 id="retry" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Retry schedule</h2>
        <p className="text-gray-700">Any non-2xx response (or transport error) triggers a retry. We do <strong>7 attempts</strong> on this back-off:</p>
        <ol className="list-decimal pl-6 text-gray-700 space-y-1 mt-2">
          <li>Initial attempt</li>
          <li>+ 1 minute</li>
          <li>+ 5 minutes</li>
          <li>+ 30 minutes</li>
          <li>+ 2 hours</li>
          <li>+ 6 hours</li>
          <li>+ 16 hours</li>
        </ol>
        <p className="text-gray-700 mt-2">Cumulative window ≈ 24h36m. After attempt 7 the delivery is marked <strong>dead-letter</strong> and surfaces in the dashboard with a Replay button.</p>
        <p className="text-gray-600 text-sm mt-2">Endpoints with 50 consecutive failures are auto-disabled. Re-enabling from the dashboard resets the counter.</p>
      </section>

      <section aria-labelledby="response" className="mb-10">
        <h2 id="response" className="text-xl font-semibold text-gray-900 mt-8 mb-4">What we expect from your endpoint</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>Respond with <strong>2xx</strong> within <strong>10 seconds</strong>. Anything else is treated as failure.</li>
          <li>Be <strong>idempotent</strong> on <code className="bg-gray-100 px-1 rounded text-xs">X-FlashLearn-Delivery</code>. We may retry the exact same payload up to 7 times.</li>
          <li>Don&apos;t do heavy work synchronously. Accept the payload, queue it, return 200. Long handlers cause spurious retries.</li>
        </ul>
      </section>

      <section aria-labelledby="rotate" className="mb-10">
        <h2 id="rotate" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Rotating the secret</h2>
        <p className="text-gray-700">From <Link href="/developer/webhooks" className="text-blue-600 hover:underline">/developer/webhooks</Link>, click the rotate icon next to your endpoint. We generate a new secret atomically and show it once. <strong>The new secret takes effect immediately.</strong> There is no overlap window. Update your verification key in the same deploy you click rotate, or signatures will mismatch on the very next event.</p>
        <p className="text-gray-600 text-sm mt-2">For zero-downtime rotation, register a second endpoint with the new secret first, drain in parallel, then delete the old endpoint.</p>
      </section>

      <section aria-labelledby="dashboard" className="mb-10">
        <h2 id="dashboard" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Delivery dashboard</h2>
        <p className="text-gray-700"><Link href="/developer/webhooks" className="text-blue-600 hover:underline">/developer/webhooks</Link> shows recent deliveries per endpoint with status (pending / success / failed / dead-letter), HTTP response code, attempt number, and a <strong>Replay</strong> action for failed or dead-lettered deliveries. Replay re-enqueues the same payload + signature; consumer-side dedupe on <code className="bg-gray-100 px-1 rounded text-xs">X-FlashLearn-Delivery</code> keeps it safe.</p>
      </section>

      <nav aria-label="Related guides" className="mt-12 flex flex-col sm:flex-row gap-4">
        <Link href="/docs/api/ecosystem" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Back: Ecosystem API</span>
          <span className="block text-xs text-gray-500 mt-1">The endpoints that fire these webhooks</span>
        </Link>
        <Link href="/developer/webhooks" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Manage your webhooks</span>
          <span className="block text-xs text-gray-500 mt-1">Register, rotate, replay, view deliveries</span>
        </Link>
      </nav>
    </article>
  );
}
