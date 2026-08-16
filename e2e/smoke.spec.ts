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
