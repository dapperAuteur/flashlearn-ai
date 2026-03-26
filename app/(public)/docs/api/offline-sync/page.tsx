import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline Sync & Conflict Resolution',
  description: 'FlashLearnAI works offline-first with PowerSync and IndexedDB. Learn how data syncs, how conflicts are detected, and how to resolve them.',
  openGraph: {
    title: 'FlashLearn Offline Sync & Conflict Resolution',
    description: 'Offline-first architecture with automatic sync and conflict resolution.',
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
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Offline Sync &amp; Conflict Resolution</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        FlashLearnAI is offline-first. Study without internet, and your data syncs automatically when you reconnect.
      </p>

      <nav aria-label="On this page" className="bg-gray-50 rounded-lg p-4 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">On this page</h2>
        <ul className="text-sm space-y-1">
          <li><a href="#architecture" className="text-blue-600 hover:underline">Architecture</a></li>
          <li><a href="#sync-flow" className="text-blue-600 hover:underline">Sync flow</a></li>
          <li><a href="#conflict-detection" className="text-blue-600 hover:underline">Conflict detection</a></li>
          <li><a href="#resolving-conflicts" className="text-blue-600 hover:underline">Resolving conflicts</a></li>
          <li><a href="#offline-indicator" className="text-blue-600 hover:underline">Offline indicator</a></li>
        </ul>
      </nav>

      <section aria-labelledby="architecture">
        <h2 id="architecture" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Architecture</h2>
        <p className="text-gray-600 mb-4">
          FlashLearnAI uses a two-layer local storage system:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Layer</th>
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Technology</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">What It Stores</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-medium">PowerSync</td><td className="py-2 pr-4">SQLite (wa-sqlite)</td><td className="py-2">Flashcard sets, cards, categories, offline set metadata</td></tr>
              <tr><td className="py-2 pr-4 font-medium">IndexedDB</td><td className="py-2 pr-4">Native browser</td><td className="py-2">Study results, session queue, pending changes, conflict queue</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 mt-4">
          A service worker caches navigation and static assets, serving an offline fallback page when the network is unavailable.
        </p>
      </section>

      <section aria-labelledby="sync-flow">
        <h2 id="sync-flow" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Sync Flow</h2>
        <p className="text-gray-600 mb-4">
          The <strong>OfflineSyncService</strong> orchestrates all sync operations. It runs automatically on three triggers:
        </p>
        <ol className="text-gray-600 space-y-2 mb-4">
          <li><strong>App startup</strong> &mdash; syncs immediately when online</li>
          <li><strong>Reconnection</strong> &mdash; triggered by the browser&apos;s <code className="bg-gray-100 px-1 rounded">online</code> event</li>
          <li><strong>Periodic</strong> &mdash; every 5 minutes while online</li>
        </ol>
        <p className="text-gray-600 mb-4">Each sync cycle runs three phases in order:</p>
        <Code lang="text" code={`1. PULL  — Fetch server flashcard changes → PowerSync local DB
2. PUSH  — Send pending set/category edits → Server API
3. PUSH  — Send queued study sessions → Server API`} />
        <p className="text-gray-600 mt-4">
          Failed operations retry up to 3 times with exponential backoff (2s, 4s, 6s). Sessions that still fail remain in the queue for the next sync cycle.
        </p>
      </section>

      <section aria-labelledby="conflict-detection">
        <h2 id="conflict-detection" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Conflict Detection</h2>
        <p className="text-gray-600 mb-4">
          A conflict occurs when you edit a flashcard set offline while someone else (or you on another device) edits the same set on the server.
        </p>
        <p className="text-gray-600 mb-4">
          During the <strong>PUSH</strong> phase, if the server returns a <code className="bg-gray-100 px-1 rounded">409 Conflict</code> response, the sync service:
        </p>
        <ol className="text-gray-600 space-y-2">
          <li>Captures both the local version and the server version</li>
          <li>Saves a <strong>SyncConflict</strong> record to the IndexedDB conflict queue</li>
          <li>Emits a <code className="bg-gray-100 px-1 rounded">conflict-detected</code> event</li>
          <li>Shows a toast notification and a persistent red banner</li>
        </ol>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          Conflicts are never silently overwritten. The app always asks you to choose which version to keep.
        </p>
      </section>

      <section aria-labelledby="resolving-conflicts">
        <h2 id="resolving-conflicts" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Resolving Conflicts</h2>
        <p className="text-gray-600 mb-4">
          Navigate to <strong>/dashboard/conflicts</strong> (or tap the &quot;Review&quot; link in the red banner) to see all unresolved conflicts.
        </p>
        <p className="text-gray-600 mb-4">Each conflict shows a side-by-side comparison:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 not-prose">
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-700 mb-2">Your Local Version</p>
            <p className="text-xs text-gray-600">The changes you made while offline on this device.</p>
          </div>
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-700 mb-2">Server Version</p>
            <p className="text-xs text-gray-600">The current version on the server (from another device or user).</p>
          </div>
        </div>
        <p className="text-gray-600 mb-4">Fields that differ are highlighted. You can:</p>
        <ul className="text-gray-600 space-y-1">
          <li><strong>Keep Local</strong> &mdash; Overwrite the server with your offline changes</li>
          <li><strong>Keep Server</strong> &mdash; Discard your local changes and use the server version</li>
        </ul>
        <p className="text-gray-600 mt-4">
          Once resolved, the conflict is removed from the queue and the chosen version is pushed to the server.
        </p>
      </section>

      <section aria-labelledby="offline-indicator">
        <h2 id="offline-indicator" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Offline Indicator</h2>
        <p className="text-gray-600 mb-4">
          A persistent banner at the bottom of the screen shows the current sync state:
        </p>
        <div className="space-y-3 not-prose text-sm">
          <div className="flex items-center gap-3 bg-amber-600 text-white rounded-lg px-4 py-2">
            <span>Amber</span><span>&mdash;</span><span>You&apos;re offline, progress saved locally</span>
          </div>
          <div className="flex items-center gap-3 bg-blue-600 text-white rounded-lg px-4 py-2">
            <span>Blue</span><span>&mdash;</span><span>Syncing items to the server</span>
          </div>
          <div className="flex items-center gap-3 bg-red-600 text-white rounded-lg px-4 py-2">
            <span>Red</span><span>&mdash;</span><span>Conflicts need your review (with &quot;Review&quot; link)</span>
          </div>
        </div>
        <p className="text-gray-600 mt-4">
          Toast notifications also appear when going offline, coming back online, and when conflicts are detected.
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
