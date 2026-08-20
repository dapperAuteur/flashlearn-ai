/**
 * What the signed-out homepage is allowed to claim, and the shape the counts
 * arrive in.
 *
 * The page used to assert "2,000+ active learners" and a "4.9/5 average rating".
 * Neither had a source. The rule that replaced them lives in this type: every
 * figure is either counted or null, and null means the line does not render.
 * There is no floor, no rounding up, and no friendlier fallback number.
 *
 * Kept apart from the counting itself so the component that renders these can
 * import the window and the shape without dragging in a database driver.
 */

/** A completed session inside this window is what makes an account active. */
export const ACTIVE_WINDOW_DAYS = 30;

/** How long a learner count is reused before the aggregate runs again. */
export const LEARNER_COUNT_TTL_MS = 60 * 60 * 1000;

/**
 * After a failed count, how long the page goes without a figure before trying
 * again. Without this, a database that is down turns every single visit into
 * another failing aggregate.
 */
export const LEARNER_COUNT_RETRY_MS = 60 * 1000;

export interface HomeSocialProof {
  /** Curated sets a visitor can open and study, or null if the files did not load. */
  setCount: number | null;
  /** Accounts with a completed session in the window, or null if the count failed. */
  activeLearners: number | null;
}
