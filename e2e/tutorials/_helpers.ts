import { expect, type Page } from "@playwright/test";

/**
 * Re-open `path` warm, as the first thing step 1 does.
 *
 * Why every spec needs this: the harness (e2e/tutorials/tutorial.ts) paints its first boundary
 * flash immediately after `page.goto(startPath)`, and `goto` resolves at the browser's `load`
 * event — but app/ClientRoot.tsx holds a "Loading..." gate until the client app mounts. Measured
 * against production on 2026-09-21: a COLD load reaches `load` in 1.7s and is not ready for 3.0s,
 * while any later navigation in the same context is ready in about 0.4s. So on a cold start the
 * flash lands on the spinner, and three of step 1's four composed seconds were a loading spinner
 * under a caption describing the finished page.
 *
 * Re-navigating puts the cold boot BEFORE flash 1, where the composer discards it, and leaves
 * step 1 holding the real page. This is a pacing fix inside a step, which is where pacing belongs
 * now that slowMo is off (see playwright.tutorial.config.ts).
 *
 * It asserts the gate is gone rather than sleeping a fixed time, so a slow day fails loudly
 * instead of recording a spinner.
 */
export async function warmStart(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(
    page.getByText("Loading...", { exact: true }),
    "The app shell never finished mounting, so this clip would open on a loading spinner.",
  ).toBeHidden({ timeout: 30_000 });
}
