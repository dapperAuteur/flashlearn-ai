import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Getting Started',
  description: 'Get started with the FlashLearnAI.WitUS.Online API in 60 seconds. Create an API key, make your first request, and understand rate limits and pricing.',
  openGraph: {
    title: 'Getting Started with the FlashLearnAI.WitUS.Online API',
    description: 'Generate AI flashcards with one API call. Free tier included.',
  },
};

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <pre
      className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed"
      role="region"
      aria-label={`${language} code example`}
    >
      <code>{code}</code>
    </pre>
  );
}

export default function GettingStartedPage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Getting Started</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        Generate AI-powered flashcards with a single API call. Free tier included, no credit card required.
      </p>

      <aside
        aria-label="Cross-product partner notice"
        className="mb-8 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900"
      >
        <strong className="font-semibold">Building a consumer-facing learning product?</strong>{' '}
        If you need child-scoped scheduled sessions, per-standard mastery rollups, COPPA cascade-delete, and signed
        outbound webhooks, see the{' '}
        <Link href="/docs/api/ecosystem" className="font-medium underline hover:text-cyan-700">
          Ecosystem API
        </Link>{' '}
        and{' '}
        <Link href="/docs/api/webhooks" className="font-medium underline hover:text-cyan-700">
          Webhooks
        </Link>{' '}
        guides. Ecosystem keys (<code className="font-mono">fl_eco_</code>) are admin-issued — contact us to request one.
      </aside>

      {/* Step 1 */}
      <section aria-labelledby="step-1">
        <h2 id="step-1" className="text-xl font-semibold text-gray-900 mt-10 mb-4 flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
          Create an Account
        </h2>
        <p className="text-gray-600 mb-4">
          Sign up at{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">flashlearnai.witus.online/auth/signup</Link>.
          Then go to the{' '}
          <Link href="/developer" className="text-blue-600 hover:underline font-medium">Developer Portal</Link>{' '}
          and click <strong>New Key</strong>.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          Copy your key immediately — it starts with <code className="font-mono bg-amber-100 px-1 rounded">fl_pub_</code> and is shown only once.
        </p>
      </section>

      {/* Step 2 */}
      <section aria-labelledby="step-2">
        <h2 id="step-2" className="text-xl font-semibold text-gray-900 mt-10 mb-4 flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
          Make Your First Request
        </h2>
        <CodeBlock code={`curl -X POST https://flashlearnai.witus.online/api/v1/generate \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"topic": "Introduction to Machine Learning"}'`} />
      </section>

      {/* Step 3 */}
      <section aria-labelledby="step-3">
        <h2 id="step-3" className="text-xl font-semibold text-gray-900 mt-10 mb-4 flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
          Understand the Response
        </h2>
        <p className="text-gray-600 mb-3">Every response uses the same envelope:</p>
        <CodeBlock language="json" code={`{
  "data": {
    "flashcards": [
      { "front": "What is supervised learning?", "back": "ML where the model learns from labeled data..." }
    ],
    "setId": "665f1a2b3c4d5e6f7a8b9c0d",
    "source": "generated",
    "cardCount": 10
  },
  "meta": {
    "requestId": "req_a1b2c3d4e5f6",
    "rateLimit": { "limit": 10, "remaining": 9, "reset": 1711843260 }
  }
}`} />
      </section>

      {/* Authentication */}
      <section aria-labelledby="auth">
        <h2 id="auth" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Authentication</h2>
        <p className="text-gray-600 mb-3">Every request requires a Bearer token:</p>
        <CodeBlock code={`Authorization: Bearer fl_pub_your_key_here`} />
      </section>

      {/* Rate Limits */}
      <section aria-labelledby="rate-limits">
        <h2 id="rate-limits" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Rate Limits</h2>
        <p className="text-gray-600 mb-3">Every response includes these headers:</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Header</th>
                <th className="pb-2 font-semibold text-gray-700" scope="col">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-RateLimit-Limit</td><td className="py-2">Max requests per minute</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-RateLimit-Remaining</td><td className="py-2">Remaining requests in window</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-RateLimit-Reset</td><td className="py-2">Unix timestamp when window resets</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">X-Request-Id</td><td className="py-2">Unique request ID for debugging</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">X-Overage</td><td className="py-2">Present when past monthly quota (paid tiers)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Codes */}
      <section aria-labelledby="errors">
        <h2 id="errors" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Error Codes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Code</th>
                <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Status</th>
                <th className="pb-2 font-semibold text-gray-700" scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">UNAUTHORIZED</td><td className="py-2 pr-4">401</td><td className="py-2">Invalid API key</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">FORBIDDEN</td><td className="py-2 pr-4">403</td><td className="py-2">Key lacks permission</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">RATE_LIMIT_EXCEEDED</td><td className="py-2 pr-4">429</td><td className="py-2">Burst limit hit</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">QUOTA_EXCEEDED</td><td className="py-2 pr-4">429</td><td className="py-2">Monthly quota (Free tier)</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">INVALID_INPUT</td><td className="py-2 pr-4">400</td><td className="py-2">Validation failed</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">NOT_FOUND</td><td className="py-2 pr-4">404</td><td className="py-2">Resource not found</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">AI_GENERATION_FAILED</td><td className="py-2 pr-4">502</td><td className="py-2">AI provider error</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section aria-labelledby="pricing">
        <h2 id="pricing" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Pricing</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Tier</th>
                <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Price</th>
                <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Generations/mo</th>
                <th className="pb-2 font-semibold text-gray-700" scope="col">API Calls/mo</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-semibold">Free</td><td className="py-2 pr-4">$0</td><td className="py-2 pr-4">100</td><td className="py-2">1,000</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-semibold">Developer</td><td className="py-2 pr-4">$19/mo</td><td className="py-2 pr-4">5,000</td><td className="py-2">50,000</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-semibold">Pro</td><td className="py-2 pr-4">$49/mo</td><td className="py-2 pr-4">25,000</td><td className="py-2">250,000</td></tr>
              <tr><td className="py-2 pr-4 font-semibold">Enterprise</td><td className="py-2 pr-4">Custom</td><td className="py-2 pr-4">Unlimited</td><td className="py-2">Unlimited</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Next Steps */}
      <section aria-labelledby="next-steps" className="mt-12">
        <h2 id="next-steps" className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/docs/api/generation" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border">
            <h3 className="font-semibold text-gray-900 text-sm">Flashcard Generation</h3>
            <p className="text-xs text-gray-500 mt-1">Generate, batch, CRUD sets, browse</p>
          </Link>
          <Link href="/docs/api/spaced-repetition" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border">
            <h3 className="font-semibold text-gray-900 text-sm">Spaced Repetition</h3>
            <p className="text-xs text-gray-500 mt-1">SM-2 study sessions and analytics</p>
          </Link>
          <Link href="/docs/api/versus-mode" className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border">
            <h3 className="font-semibold text-gray-900 text-sm">Versus Mode</h3>
            <p className="text-xs text-gray-500 mt-1">Competitive challenges and scoring</p>
          </Link>
        </div>
      </section>
    </article>
  );
}
