import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Link Tracking & Short URLs',
  description: 'Every shared link on FlashLearnAI is tracked with Switchy.io short URLs, marketing pixels, and UTM attribution. Learn how link tracking works across versus challenges, flashcard sets, and study results.',
  openGraph: {
    title: 'FlashLearn Link Tracking & Short URLs',
    description: 'Tracked short links with pixel attribution for all shared content.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} code example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function LinkTrackingGuidePage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Link Tracking &amp; Short URLs</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        Every shared link on FlashLearnAI is automatically tracked with Switchy.io short URLs, marketing pixels, and UTM attribution.
      </p>

      <nav aria-label="On this page" className="bg-gray-50 rounded-lg p-4 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">On this page</h2>
        <ul className="text-sm space-y-1">
          <li><a href="#how-it-works" className="text-blue-600 hover:underline">How it works</a></li>
          <li><a href="#tracked-content" className="text-blue-600 hover:underline">What gets tracked</a></li>
          <li><a href="#utm-parameters" className="text-blue-600 hover:underline">UTM parameters</a></li>
          <li><a href="#pixel-tracking" className="text-blue-600 hover:underline">Pixel tracking</a></li>
          <li><a href="#admin-dashboard" className="text-blue-600 hover:underline">Admin dashboard</a></li>
          <li><a href="#backfill" className="text-blue-600 hover:underline">Backfilling existing content</a></li>
        </ul>
      </nav>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-xl font-semibold text-gray-900 mt-8 mb-4">How It Works</h2>
        <p className="text-gray-600 mb-4">
          When shareable content is created or published, FlashLearnAI automatically generates a tracked short link via the{' '}
          <a href="https://developers.switchy.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Switchy.io API</a>.
          This happens in the background (fire-and-forget) so it never blocks the main flow.
        </p>
        <p className="text-gray-600 mb-4">
          Short links include custom OG metadata (title, description, image) for rich social previews, and all configured marketing pixels are automatically attached.
        </p>
        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          If a short link isn&apos;t available (e.g., Switchy is down), share modals gracefully fall back to the full URL. The app never breaks.
        </p>
      </section>

      <section aria-labelledby="tracked-content">
        <h2 id="tracked-content" className="text-xl font-semibold text-gray-900 mt-10 mb-4">What Gets Tracked</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Content Type</th>
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Slug Prefix</th>
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Trigger</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">Example</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-medium">Versus challenges</td><td className="py-2 pr-4"><code className="bg-gray-100 px-1 rounded">v-</code></td><td className="py-2 pr-4">Challenge created</td><td className="py-2"><code className="text-xs bg-gray-100 px-1 rounded">i.witus.online/v-x7k2m9</code></td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-medium">Flashcard sets</td><td className="py-2 pr-4"><code className="bg-gray-100 px-1 rounded">s-</code></td><td className="py-2 pr-4">Set made public</td><td className="py-2"><code className="text-xs bg-gray-100 px-1 rounded">i.witus.online/s-machine-learning</code></td></tr>
              <tr><td className="py-2 pr-4 font-medium">Study results</td><td className="py-2 pr-4"><code className="bg-gray-100 px-1 rounded">r-</code></td><td className="py-2 pr-4">Session shared</td><td className="py-2"><code className="text-xs bg-gray-100 px-1 rounded">i.witus.online/r-abc123</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="utm-parameters">
        <h2 id="utm-parameters" className="text-xl font-semibold text-gray-900 mt-10 mb-4">UTM Parameters</h2>
        <p className="text-gray-600 mb-4">
          Every share link includes UTM parameters for attribution tracking. Switchy preserves these through the redirect.
        </p>
        <Code lang="text" code={`https://i.witus.online/v-x7k2m9?utm_source=twitter&utm_medium=share&utm_campaign=versus`} />
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Parameter</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">Values</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-medium">utm_source</td><td className="py-2">twitter, facebook, email, copy, native</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-medium">utm_medium</td><td className="py-2">share</td></tr>
              <tr><td className="py-2 pr-4 font-medium">utm_campaign</td><td className="py-2">versus, results, set, challenge_preview</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pixel-tracking">
        <h2 id="pixel-tracking" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Pixel Tracking</h2>
        <p className="text-gray-600 mb-4">
          All configured marketing pixels are automatically attached to every short link. Supported platforms:
        </p>
        <ul className="text-gray-600 space-y-1">
          <li>Facebook Pixel</li>
          <li>Google Analytics (GA4)</li>
          <li>TikTok Pixel</li>
          <li>Twitter/X Pixel</li>
          <li>LinkedIn Insight Tag</li>
          <li>Pinterest Tag</li>
          <li>Snapchat Pixel</li>
        </ul>
        <p className="text-gray-600 mt-4">
          Pixels are configured in the Switchy dashboard and referenced via the <code className="bg-gray-100 px-1 rounded">SWITCHY_PIXEL_IDS</code> environment variable.
        </p>
      </section>

      <section aria-labelledby="admin-dashboard">
        <h2 id="admin-dashboard" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Admin Dashboard</h2>
        <p className="text-gray-600 mb-4">
          The <strong>/admin/links</strong> page shows all tracked short links with:
        </p>
        <ul className="text-gray-600 space-y-1">
          <li>Summary cards (total links, by type: versus/set/results)</li>
          <li>Missing links count (shareable content without short links)</li>
          <li>Filterable table with type badges, content labels, and short URLs</li>
          <li>One-click backfill for existing content</li>
        </ul>
      </section>

      <section aria-labelledby="backfill">
        <h2 id="backfill" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Backfilling Existing Content</h2>
        <p className="text-gray-600 mb-4">
          Content published before short link tracking was enabled can be backfilled from the admin dashboard.
          The backfill processes up to 100 items per type per request with rate limiting (150ms between calls).
        </p>
        <Code lang="text" code={`POST /api/admin/links/backfill
→ { "processed": 47, "succeeded": 45, "failed": 2 }`} />
      </section>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          <Link href="/docs/api" className="text-blue-600 hover:underline">&larr; Back to API Reference</Link>
          {' '}&middot;{' '}
          <Link href="/docs/api/versus-mode" className="text-blue-600 hover:underline">Versus Mode Guide &rarr;</Link>
        </p>
      </div>
    </article>
  );
}
