import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Versus Mode API',
  description: 'Build multiplayer quiz games with the FlashLearn Versus API. Challenge codes, composite scoring (0-1000), leaderboards, and ELO ratings.',
  openGraph: {
    title: 'FlashLearn Versus Mode API Guide',
    description: 'Build competitive learning games. Composite scoring, leaderboards, and ELO ratings via API.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} code example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function VersusModeGuidePage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Versus Mode</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        Build quiz competitions, classroom tournaments, and social learning with composite scoring and leaderboards.
      </p>

      <section aria-labelledby="scoring">
        <h2 id="scoring" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Composite Scoring (0-1000)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Factor</th>
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Weight</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">What It Measures</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-semibold">Accuracy</td><td className="py-2 pr-4">40% (400 pts)</td><td className="py-2">Correct answers / total</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-semibold">Speed</td><td className="py-2 pr-4">25% (250 pts)</td><td className="py-2">Seconds per card (3s=max, 30s+=0)</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-semibold">Confidence</td><td className="py-2 pr-4">20% (200 pts)</td><td className="py-2">Calibration: knowing when you know</td></tr>
              <tr><td className="py-2 pr-4 font-semibold">Streak</td><td className="py-2 pr-4">15% (150 pts)</td><td className="py-2">Longest consecutive correct / total</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="flow">
        <h2 id="flow" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Challenge Flow</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">1. Create a challenge</h3>
        <Code lang="json" code={`POST /api/v1/versus/challenges
{
  "flashcardSetId": "abc123",
  "scope": "public",          // "direct" (1v1), "classroom" (30), or "public" (50)
  "studyMode": "classic",
  "maxParticipants": 10
}

// Returns: { "challengeCode": "X7K2M9", "challengeId": "...", "expiresAt": "..." }`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2. Others join with the code</h3>
        <Code lang="json" code={`POST /api/v1/versus/join
{ "challengeCode": "X7K2M9" }

// Returns: setName, cardCount, participantCount`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3. Play the challenge</h3>
        <Code lang="json" code={`POST /api/v1/versus/challenges/{id}/play

// Returns: sessionId + ordered flashcards (same order for all players)`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">4. Submit study results, then complete</h3>
        <Code lang="json" code={`// First, save card results via the study session
POST /api/v1/study/sessions/{sessionId}/complete
{ "results": [{ "cardId": "...", "isCorrect": true, "timeSeconds": 3.5, "confidenceRating": 5 }] }

// Then complete the challenge to get your composite score
POST /api/v1/versus/challenges/{id}/complete

// Returns: { "compositeScore": { "totalScore": 847, "accuracyScore": 360, ... }, "rank": 1 }`} />

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5. View the leaderboard</h3>
        <Code code={`curl https://flashlearnai.witus.online/api/v1/versus/challenges/{id}/board \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY"

# Returns ranked participants with full score breakdowns`} />
      </section>

      <section aria-labelledby="other-endpoints">
        <h2 id="other-endpoints" className="text-xl font-semibold text-gray-900 mt-10 mb-4">All Versus Endpoints</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Endpoint</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">Description</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /versus/challenges</td><td className="py-2">Create challenge</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /versus/challenges</td><td className="py-2">List your challenges</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /versus/challenges/:id</td><td className="py-2">Challenge details</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /versus/challenges/:id/play</td><td className="py-2">Start playing</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /versus/challenges/:id/complete</td><td className="py-2">Get composite score</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /versus/challenges/:id/board</td><td className="py-2">Leaderboard</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /versus/join</td><td className="py-2">Join by code</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /versus/open</td><td className="py-2">Browse public challenges</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">GET /versus/stats</td><td className="py-2">ELO rating, win/loss, streaks</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="tier-limits">
        <h2 id="tier-limits" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Tier Limits</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Feature</th>
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Free</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">Developer / Pro</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4">Challenges/day</td><td className="py-2 pr-4">3</td><td className="py-2">Unlimited</td></tr>
              <tr className="border-b"><td className="py-2 pr-4">Study modes</td><td className="py-2 pr-4">Classic only</td><td className="py-2">Classic + Multiple Choice</td></tr>
              <tr className="border-b"><td className="py-2 pr-4">Max participants</td><td className="py-2 pr-4">5</td><td className="py-2">Up to 50</td></tr>
              <tr><td className="py-2 pr-4">Expiry</td><td className="py-2 pr-4">24 hours</td><td className="py-2">72 hours</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <nav aria-label="Previous guides" className="mt-12 flex flex-col sm:flex-row gap-4">
        <Link href="/docs/api/spaced-repetition" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Prev: Spaced Repetition</span>
          <span className="block text-xs text-gray-500 mt-1">SM-2 study sessions and analytics</span>
        </Link>
        <Link href="/docs/api" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Interactive Reference</span>
          <span className="block text-xs text-gray-500 mt-1">Try all 23 endpoints live</span>
        </Link>
      </nav>
    </article>
  );
}
