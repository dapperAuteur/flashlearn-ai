import { test, expect } from "@playwright/test";

// Post-deploy smoke (@smoke): the production workflow job runs ONLY tests tagged @smoke, so keep
// this file to checks that are safe and meaningful against live production. /api/health pings
// MongoDB on every request and returns 503 fast when it's unreachable (see
// app/api/health/route.ts), so a green here means "deployed AND serving real data", which is the
// whole point of the gate.
test("@smoke health endpoint answers ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  // Contract from app/api/health/route.ts: 200 {"ok":true,"checks":{"db":"ok"}}
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.checks?.db).toBe("ok");
});

test("@smoke homepage serves", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
});

// Error pages keep the app shell (witus docs/shared-ui-ux-dx.md): a missing path answers 404 and
// still renders the header sign-in link and the footer. The app renders client-side after
// PowerSync opens, so this runs in a browser rather than reading the raw HTML.
test("@smoke not-found page keeps the header and footer", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist-smoke");
  expect(res?.status()).toBe(404);
  await expect(page.locator("footer").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('a[href="/auth/signin"]').first()).toBeAttached();
  await expect(page.locator("h1")).toHaveCount(1);
});
