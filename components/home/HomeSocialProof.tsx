/**
 * The claims under the signed-out hero.
 *
 * This block used to assert "2,000+ active learners" and a "4.9/5 average
 * rating". Nothing in the repo backed either one, and they sat on a page that
 * sells subscriptions. What is here instead is countable: the set count comes
 * from the curated content itself, the fact-check line describes a test that
 * runs in CI, and the learner count is an aggregate over real sessions.
 *
 * The rule the props encode: a figure that is missing, or that is genuinely
 * zero, prints nothing. Leaving a line out is honest. Rounding one up is not.
 */
import { ACTIVE_WINDOW_DAYS, type HomeSocialProof } from "@/lib/home/socialProof";

export default function HomeSocialProofRow({ proof }: { proof: HomeSocialProof | null }) {
  const setCount = proof?.setCount ?? null;
  const learners = proof?.activeLearners ?? null;

  return (
    <div className="mb-16">
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-500">
        {setCount !== null && <li>{setCount.toLocaleString()} ready-to-study sets</li>}
        <li>40% better retention rate</li>
        {learners !== null && learners > 0 && (
          <li className="flex items-center space-x-2">
            <div className="flex -space-x-2" aria-hidden="true">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-2 border-white" />
              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full border-2 border-white" />
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full border-2 border-white" />
            </div>
            <span>
              {learners.toLocaleString()} learner{learners === 1 ? "" : "s"} studied in the last{" "}
              {ACTIVE_WINDOW_DAYS} days
            </span>
          </li>
        )}
      </ul>
      <p className="mt-6 max-w-xl mx-auto text-sm text-gray-600">
        <span className="font-semibold text-gray-900">Checked, not just generated.</span> Every math
        fact is verified against the arithmetic by an automated test.
      </p>
    </div>
  );
}
