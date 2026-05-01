# Admin Guide: Launch a Promotional Period

## Overview

A "promotion" temporarily raises every plan's AI generation cap to a flat number for a fixed window. The first one shipped was the Finals Season Boost (April 30 → May 31, 2026, lifting all tiers to 20 sets per 30 days). This guide documents the current one-off process for launching subsequent promos.

The current implementation is hardcoded code per promo. A generic promo system that would let marketing schedule promos via `/admin/settings` without engineering involvement is parked at [plans/future/03-generic-promo-system.md](../../plans/future/03-generic-promo-system.md). Until that ships, follow this runbook.

## When to launch a promo

Reasonable triggers:

- Seasonal study event (finals, midterms, back-to-school, summer reading challenge)
- Product launch boost paired with a press push
- Competitive response (e.g., another tool drops their cap; we briefly outpace)
- Recovery after a service outage or pricing reset

Don't launch promos faster than once per quarter unless there's a specific reason. Constant promos train users that the regular cap is wrong.

## Pre-flight decisions

Before touching code, lock in:

| Decision | Notes |
|---|---|
| Promo slug | Short, machine-friendly (e.g., `finals-2026`, `back-to-school-2026`) |
| Start date | Optional. Most promos can start on deploy. If you want a future-dated start, code needs an extra `startsAt` check. |
| End date | Required. ISO 8601 UTC. `2026-06-01T06:59:00Z` was the finals cutoff (= May 31 11:59 PT). |
| Flat limit | The cap every tier floors to during the promo. Finals used 20. Should usually be at least 2x the highest paid tier. |
| Should tier defaults change? | If yes, update `RATE_LIMITS` separately at promo end (see step 7). |
| Banner copy | Short, mobile-first. No em dashes. No AI-cliché vocabulary. |
| Pricing pill copy | Short tag next to the AI-cap line on each tier card. Finals used "20 through May 31". |

Run all copy through the brand-voice check before coding: no em dashes, no `robust / leverage / comprehensive / seamless / delve / navigate / journey / unlock`.

## Engineering steps

### 1. Branch off main

```bash
git checkout main && git pull --ff-only
git checkout -b feat/<promo-slug>-promo
```

### 2. Create or rename the promo helper

The finals helper lives at [lib/promo/finals.ts](../../lib/promo/finals.ts). Either:

**Option A: Rename and reuse** (if the previous promo has fully ended and you don't want both at once): rename the file and the exported function to match the new slug.

**Option B: Add alongside** (if both promos could overlap): create `lib/promo/<slug>.ts` mirroring the `finals.ts` shape. The rate limiter then needs to consider both. Cleaner long-term to consolidate when adding the second one.

The helper exports `getActivePromo()` returning `{ active, endsAt, flatLimit }`. Source the cutoff from a per-promo env var with a hardcoded fallback constant (so a missing env doesn't break date math).

### 3. Wire into the rate limiter

[lib/ratelimit/rateLimitGemini.ts](../../lib/ratelimit/rateLimitGemini.ts) currently has:

```ts
const promo = getFinalsPromo();
const effectiveLimit = promo.active ? Math.max(tierLimit, promo.flatLimit) : tierLimit;
```

If you renamed (Option A), update the import. If you added alongside (Option B), pick the highest active flat limit:

```ts
const active = [getFinalsPromo(), getBackToSchoolPromo()].filter((p) => p.active);
const flatLimit = active.length ? Math.max(...active.map((p) => p.flatLimit)) : 0;
const effectiveLimit = flatLimit > 0 ? Math.max(tierLimit, flatLimit) : tierLimit;
```

### 4. Update the banner + pricing UI

[components/ui/FinalsPromoBanner.tsx](../../components/ui/FinalsPromoBanner.tsx) and the inline blocks in [app/(public)/pricing/page.tsx](../../app/(public)/pricing/page.tsx) and [app/(public)/page.tsx](../../app/(public)/page.tsx) all read from `getFinalsPromo()`. Either rename them to a generic name or fork. For per-tier pricing pills, update the regex/match in pricing/page.tsx that conditionally renders the badge.

### 5. Tests

Cover the new helper:
- env var override
- hardcoded fallback when env unset
- unparseable env falls back
- inactive after cutoff
- inactive at exactly the cutoff (strict less-than)

Cover the rate limiter:
- non-promo behavior unchanged
- effective limit lifts to flat limit during promo
- limit reverts after cutoff

[__tests__/lib/promo/finals.test.ts](../../__tests__/lib/promo/finals.test.ts) is the template.

### 6. Press + social

Drop matching artifacts into `press/`:

- A press release (model on [press/2026-04-finals-season-promo.md](../../press/2026-04-finals-season-promo.md))
- A social calendar covering the window (model on [press/2026-05-finals-promo-social.md](../../press/2026-05-finals-promo-social.md))
- Update [press/distribution-playbook.md](../../press/distribution-playbook.md)

### 7. Commit + push, wait for merge

Branch → commit → push → stop. Don't merge yourself. See [CLAUDE.md](../../CLAUDE.md) §"Branch hygiene".

## Operational steps (after merge, before promo goes live)

### 8. Set the promo end env var on Vercel

Vercel dashboard → flashlearnai-ai project → Settings → Environment Variables. Add:

- **Name:** `<PROMO_SLUG>_PROMO_END_UTC` (e.g., `BACK_TO_SCHOOL_PROMO_END_UTC`)
- **Value:** the ISO 8601 cutoff
- **Environments:** Production AND Preview

Trigger a redeploy.

### 9. Update RATE_LIMITS in /admin/settings (only if tier defaults are changing)

Most promos lift the floor without changing tier defaults. If this promo also resets tier defaults (the way finals did), update `RATE_LIMITS` in [/admin/settings](https://flashlearnai.witus.online/admin/settings) per the schema. The PUT handler auto-clears the rate-limit cache.

### 10. Enable the announcement banner in /admin/settings

Update the banner config row to `active: true` with the promo copy. Schema:

```json
{
  "active": true,
  "bannerId": "<promo-slug>",
  "type": "promo",
  "message": "<short, mobile-first promo line>",
  "linkText": "See plans",
  "linkUrl": "/pricing"
}
```

Changing `bannerId` from the previous promo's ID re-prompts users who dismissed the previous banner.

### 11. Smoke test

- Sign in as a free-tier test user. Confirm the inline FinalsPromoBanner renders on `/` and `/pricing`.
- Confirm the global AnnouncementBanner renders in the dashboard.
- Generate up to (flat-limit + 1) flashcard sets. The (flat-limit + 1)th should be blocked with a 429.
- Verify the days-left countdown on the inline banner is correct.

## At promo end

### 12. Manual cleanup checklist (the day after the cutoff)

- The inline banner auto-hides via `getActivePromo().active === false`. No action required.
- The global AnnouncementBanner has no `endDate` field today. Manually flip `active: false` in [/admin/settings](https://flashlearnai.witus.online/admin/settings).
- If `RATE_LIMITS` was changed for the promo, decide whether to keep the new defaults or revert to the prior values via [/admin/settings](https://flashlearnai.witus.online/admin/settings).
- Delete or update the env var `<PROMO_SLUG>_PROMO_END_UTC` if it's no longer needed.

### 13. Support readiness

If tier defaults dropped at promo end, paid users with promo-era counts above the new tier cap will be locked out until their `lastAiGenerationDate` slides past 30 days. See the playbook at `plans/user-tasks/04-promo-end-counter-resets.md` (gitignored, BAM-only) for the manual reset procedure.

## Rollback

If a launched promo needs to end early:

- Vercel: change the env var to a past date (e.g., `2020-01-01T00:00:00Z`) and redeploy.
- Banner: flip `active: false` in `/admin/settings`.
- Code: no change needed; the helpers respect the env var.

If a promo causes a billing or limit-bypass incident:

- First: change the env var to a past date and redeploy. Cap reverts immediately.
- Second: review usage data for the affected window in `/admin/users` or via mongosh.
- Third: open an incident review and decide whether the next promo design needs different guardrails.

## Future improvements

The full generic-promo-system design is at [plans/future/03-generic-promo-system.md](../../plans/future/03-generic-promo-system.md). When triggered (next promo planned, marketing wants A/B testing, schedule promos in advance), 1-2 days of focused engineering replaces this runbook with a `/admin/promotions` UI.

## Related

- [plans/future/03-generic-promo-system.md](../../plans/future/03-generic-promo-system.md)
- [lib/promo/finals.ts](../../lib/promo/finals.ts): current one-off implementation
- [lib/ratelimit/rateLimitGemini.ts](../../lib/ratelimit/rateLimitGemini.ts)
- [components/ui/FinalsPromoBanner.tsx](../../components/ui/FinalsPromoBanner.tsx)
- [press/distribution-playbook.md](../../press/distribution-playbook.md)
