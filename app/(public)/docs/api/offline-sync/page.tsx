import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline Study & Sync',
  description: 'FlashLearnAI copies your own sets to the device so you can study without a connection, then uploads your results when you reconnect. Here is exactly what travels and what does not.',
  openGraph: {
    title: 'FlashLearn Offline Study & Sync',
    description: 'Study your own sets with no connection. Results upload when you reconnect.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} code example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function OfflineSyncGuidePage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Offline Study &amp; Sync</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        Sign in once with a connection and your own sets are copied to the device. After that you can study them on a train, in a basement, or on a plane, and your results upload the next time you are online.
      </p>

      <nav aria-label="On this page" className="bg-gray-50 rounded-lg p-4 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">On this page</h2>
        <ul className="text-sm space-y-1">
          <li><a href="#architecture" className="text-blue-600 hover:underline">Where the data lives</a></li>
          <li><a href="#sync-flow" className="text-blue-600 hover:underline">Sync flow</a></li>
          <li><a href="#what-travels" className="text-blue-600 hover:underline">What travels with a card</a></li>
          <li><a href="#limits" className="text-blue-600 hover:underline">What offline does not cover</a></li>
          <li><a href="#offline-indicator" className="text-blue-600 hover:underline">Offline indicator</a></li>
        </ul>
      </nav>

      <section aria-labelledby="architecture">
        <h2 id="architecture" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Where the Data Lives</h2>
        <p className="text-gray-600 mb-4">
          Two stores sit on the device, and they hold different things:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Store</th>
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Technology</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">What it holds</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-medium">Local set cache</td><td className="py-2 pr-4">SQLite in the browser (PowerSync with wa-sqlite)</td><td className="py-2">A copy of the flashcard sets and cards you own. Read side only: the app studies from it, and the server is the source it copies from.</td></tr>
              <tr><td className="py-2 pr-4 font-medium">IndexedDB</td><td className="py-2 pr-4">Native browser</td><td className="py-2">Your study results and the queue of sessions waiting to upload. Until a session uploads, this is the only copy of it anywhere.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 mt-4">
          A service worker separately caches page shells and static assets, and serves an offline fallback page when a page you have not visited is requested with no network.
        </p>
      </section>

      <section aria-labelledby="sync-flow">
        <h2 id="sync-flow" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Sync Flow</h2>
        <p className="text-gray-600 mb-4">
          The sync service runs on three triggers:
        </p>
        <ol className="text-gray-600 space-y-2 mb-4">
          <li><strong>App startup</strong>, if the browser is online</li>
          <li><strong>Reconnection</strong>, from the browser&apos;s <code className="bg-gray-100 px-1 rounded">online</code> event</li>
          <li><strong>Every 5 minutes</strong> while online</li>
        </ol>
        <p className="text-gray-600 mb-4">Each run does two things that matter:</p>
        <Code lang="text" code={`1. DOWNLOAD  Sets and cards you own, changed since the last
             checkpoint, into the local set cache.

2. UPLOAD    Study sessions queued in IndexedDB, sent to the
             server. This is the moment your spaced-repetition
             schedule advances.`} />
        <p className="text-gray-600 mt-4">
          Each queued session gets up to three upload attempts, pausing two seconds and then four seconds between them. A session that still fails stays in the queue and is tried again on the next run, so closing the tab does not lose it.
        </p>
        <p className="text-gray-600 mt-4">
          The download is a poll, not a live stream. Nothing is pushed to the device between runs, so a set you edit on a laptop can take up to five minutes to appear on a phone that is already open.
        </p>
      </section>

      <section aria-labelledby="what-travels">
        <h2 id="what-travels" className="text-xl font-semibold text-gray-900 mt-10 mb-4">What Travels With a Card</h2>
        <p className="text-gray-600 mb-4">
          A cached card carries everything the study player needs to ask the question as it was written:
        </p>
        <ul className="text-gray-600 space-y-1 mb-4">
          <li>Front and back text</li>
          <li>Front and back images, with their alt text</li>
          <li>Front and back video, with its alt text</li>
          <li>Authored multiple-choice options and the id of the correct one</li>
          <li>Card order within the set</li>
        </ul>
        <p className="text-gray-600">
          The authored options matter most in the curated math library, where a fact card ships its own answer choices. With them cached, an offline multiple-choice question offers the same choices it would online.
        </p>
      </section>

      <section aria-labelledby="limits">
        <h2 id="limits" className="text-xl font-semibold text-gray-900 mt-10 mb-4">What Offline Does Not Cover</h2>
        <p className="text-gray-600 mb-4">
          Studying offline works. Everything else about offline is thinner than it looks, and it is better to say so:
        </p>
        <ul className="text-gray-600 space-y-3 mb-4">
          <li><strong>The copy runs one way.</strong> Sets flow from the server to the device. A set you create or edit while offline is not reliably sent back, so treat editing as something to do with a connection.</li>
          <li><strong>No clash detection.</strong> Nothing compares versions when a set is saved. If the same set is edited in two places, the last save wins and the earlier one is gone with no warning.</li>
          <li><strong>Only sets you own.</strong> A public set from Explore belongs to someone else, so it is never copied to the device and cannot be studied without a connection.</li>
          <li><strong>A device has to sync at least once.</strong> A browser signing in for the first time with no connection has nothing cached to study.</li>
          <li><strong>Generating, sharing, and versus mode need the network.</strong> So do the dashboard and study history pages, which read from the server every time.</li>
        </ul>
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
          An earlier version of this page described a conflict review screen with a side-by-side diff. That feature never functioned. The sync service watched for a response the API never sent, so no clash was ever recorded and the screen was always empty. It has been removed rather than left in place as a promise the code could not keep.
        </p>
      </section>

      <section aria-labelledby="offline-indicator">
        <h2 id="offline-indicator" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Offline Indicator</h2>
        <p className="text-gray-600 mb-4">
          A banner at the bottom of the screen appears when there is something to say:
        </p>
        <div className="space-y-3 not-prose text-sm">
          <div className="flex items-center gap-3 bg-amber-600 text-white rounded-lg px-4 py-2">
            <span className="font-semibold">Amber</span><span>You&apos;re offline, progress saved locally</span>
          </div>
          <div className="flex items-center gap-3 bg-blue-600 text-white rounded-lg px-4 py-2">
            <span className="font-semibold">Blue</span><span>Uploading queued items to the server</span>
          </div>
        </div>
        <p className="text-gray-600 mt-4">
          Toast notifications also appear when the connection drops and when it returns.
        </p>
      </section>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          <Link href="/docs/api" className="text-blue-600 hover:underline">&larr; Back to API Reference</Link>
          {' '}&middot;{' '}
          <Link href="/docs/api/link-tracking" className="text-blue-600 hover:underline">Link Tracking Guide &rarr;</Link>
        </p>
      </div>
    </article>
  );
}
