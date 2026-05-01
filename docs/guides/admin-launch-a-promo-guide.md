# Admin Guide: Launch a Promotional Period

## Overview

A "promotion" temporarily raises every plan's AI generation cap to a flat number for a fixed window. The first one shipped was the Finals Season Boost (April 30 → May 31, 2026, lifting all tiers to 20 sets per 30 days).

Promos are now configured through the [/admin/promotions](https://flashlearnai.witus.online/admin/promotions) page. **No code changes required.** The rate limiter, the public banner, and the per-tier pricing pill all read from the active `Promotion` document via `/api/promo/active`.

This guide covers the new admin-UI flow. The earlier hardcoded approach (env vars + code edits) is retired; the docs below replace the prior runbook.

## When to launch a promo

Reasonable triggers:

- Seasonal study event (finals, midterms, back-to-school, summer reading challenge)
- Product launch boost paired with a press push
- Competitive response (e.g., another tool drops their cap; we briefly outpace)
- Recovery after a service outage or pricing reset

Don't launch promos faster than once per quarter unless there's a specific reason. Constant promos train users that the regular cap is wrong.

## Pre-flight decisions

Before opening the admin form, lock in:

| Decision | Notes |
|---|---|
| Slug | Short, machine-friendly, lowercase. e.g. `finals-2026`, `back-to-school-2026`. Used as the unique key. Cannot be changed after creation. |
| Name | Human-readable. "Finals Season Boost", "Back-to-School Boost". |
| Flat limit | The cap every tier floors to during the promo. Should usually be at least 2x the highest paid tier (10). Finals used 20. |
| Starts at | UTC datetime. Future-dated is fine; the promo activates automatically when the start time passes. |
| Ends at | UTC datetime. Required. The promo deactivates server-side at this time. |
| Banner message | Short, mobile-first sentence shown on landing + every page (when banner enabled). 240 char max. No em dashes, no AI-cliché vocabulary. |
| Banner link / label | Where the banner CTA goes. Defaults to `/pricing` and "See plans". |
| Pricing-page callout | Slightly longer copy under the inline banner on /pricing. 240 char max. |
| Pricing-tier badge | Short tag shown next to the AI-cap line on each tier card. e.g. "20 through May 31". 60 char max. |

Run all copy through the brand-voice check before pasting it in: no em dashes, no `robust / leverage / comprehensive / seamless / delve / navigate / journey / unlock`.

## The flow

### 1. Sign in as Admin

You need a user with `role: 'Admin'` on production. Your usual admin account.

### 2. Open /admin/promotions

[https://flashlearnai.witus.online/admin/promotions](https://flashlearnai.witus.online/admin/promotions)

The top of the page has the create form. Below it is the list of all existing promos with their state (upcoming / active / ended / disabled).

### 3. Fill out the form

Each field maps directly to the schema captured in pre-flight. The form is plain HTML inputs:

- Slug (text, lowercase + numbers + hyphens only)
- Name (text)
- Flat limit (number)
- Active (checkbox; leave checked unless you want the kill switch off at creation)
- Starts at / Ends at (datetime-local pickers, treated as UTC)
- Banner message + link + label
- Pricing callout + tier badge

Below the banner-message field, the form shows a brand-voice hint reminding you to avoid em dashes and AI-cliché vocabulary. Save when ready.

### 4. Verification (under 5 minutes)

- Open the promo's row in the list. Status should show `active` if you set start time in the past, `upcoming` if in the future.
- Visit [/](https://flashlearnai.witus.online/) (landing) and [/pricing](https://flashlearnai.witus.online/pricing). The hero strip and inline pricing banner should render with your message + days-left countdown.
- Per-tier cards should show your `pricingTierBadge` next to the AI-cap line.
- Sign in as a Free-tier test account and confirm the rate limiter respects the higher flat limit. Generate up to (flat-limit + 1) flashcard sets; the (flat-limit + 1)th should 429.

### 5. Press + social (optional but recommended for big promos)

For finals-scale promos worth coverage, drop matching artifacts into `press/`:

- A press release (model: [press/2026-04-finals-season-promo.md](../../press/2026-04-finals-season-promo.md))
- A social calendar covering the window (model: [press/2026-05-finals-promo-social.md](../../press/2026-05-finals-promo-social.md))
- Update [press/distribution-playbook.md](../../press/distribution-playbook.md) with the new entries

For smaller promos (e.g., a one-week boost paired with a single product update), skip the press release and post directly on the existing channels.

## At promo end

The system handles the cutover automatically:

- `/api/promo/active` stops returning the promo once `endsAt` passes
- The hero + inline banners hide on next page load
- The pricing tier badge disappears
- The rate limiter falls back to the standard tier defaults

**One thing the system does NOT auto-handle:**

If users generated above their normal-tier cap during the promo, they'll be temporarily locked out post-promo until their 30-day rolling window slides past the oldest qualifying generation. See [plans/user-tasks/04-promo-end-counter-resets.md](../../plans/user-tasks/04-promo-end-counter-resets.md) (gitignored BAM-only operator notes) for the manual reset procedure to apply when a paid user reports being locked.

### Optional: post-promo cleanup

- If the promo had an associated AnnouncementBanner config in [/admin/settings](https://flashlearnai.witus.online/admin/settings), set `expiresAt` to your end date so the banner auto-hides without manual intervention next time.
- Mark the Promotion `active: false` if you want it filtered out of any future "all promos" queries (optional; ended promos sort to the bottom regardless).

## Rollback

To end an active promo early:

- Open `/admin/promotions`
- Click "Disable" on the row (toggles `active` to false)
- Or click "Edit" and shorten the `endsAt` to a past time

The cap reverts on the next request after the cache invalidates (5-minute TTL on the in-process promo cache). To force immediate effect:

- The PATCH endpoint already calls `clearPromotionsCache()`, so the next request from any process should pick up the new state. If a stale function instance is still serving, redeploying the Vercel project flushes all instances.

If a promo causes a billing or limit-bypass incident:

1. Disable via the admin UI (above)
2. Review usage data via `/admin/users` or mongosh
3. If specific users abused the higher cap, manually adjust their `aiGenerationCount` per the playbook in [plans/user-tasks/04-promo-end-counter-resets.md](../../plans/user-tasks/04-promo-end-counter-resets.md)
4. Open an incident review and decide whether the next promo design needs different guardrails (e.g. a per-user cap on top of the flat-limit floor)

## Multi-promo behavior

Multiple promos can exist in the database simultaneously. The rate limiter picks the active one with the highest `flatLimit` via `Math.max`. Useful patterns:

- Schedule a back-to-school promo today with `startsAt` in August. It sits as `upcoming` until then, no traffic impact.
- Run a small evergreen promo (e.g., flat 8 for everyone) and seasonally overlap a bigger one (flat 20). The bigger wins while active; the small one resumes when the bigger ends.
- Use the `active` toggle as a kill switch independent of dates: let a promo's date window stay correct in the record while temporarily disabling it.

## Initial seed

The Finals Season Boost was migrated from the old hardcoded `lib/promo/finals.ts` via the one-time `npm run seed:finals-promo` script. That script is idempotent and safe to re-run; it upserts on slug `finals-2026`. After the first run there's no need to run it again unless the doc gets accidentally deleted.

## Schema reference

Full Promotion schema lives at [models/Promotion.ts](../../models/Promotion.ts). Public projection (what `/api/promo/active` returns) lives at [lib/promo/promotions.ts](../../lib/promo/promotions.ts) as the `ActivePromotion` interface.

## Related

- [models/Promotion.ts](../../models/Promotion.ts)
- [lib/promo/promotions.ts](../../lib/promo/promotions.ts)
- [app/api/admin/promotions/route.ts](../../app/api/admin/promotions/route.ts) (GET list / POST create)
- [app/api/admin/promotions/[slug]/route.ts](../../app/api/admin/promotions/[slug]/route.ts) (PATCH / DELETE)
- [app/api/promo/active/route.ts](../../app/api/promo/active/route.ts) (public read)
- [components/ui/ActivePromoBanner.tsx](../../components/ui/ActivePromoBanner.tsx)
- [scripts/seedFinalsPromo.ts](../../scripts/seedFinalsPromo.ts) (idempotent seed)
- [press/distribution-playbook.md](../../press/distribution-playbook.md)
