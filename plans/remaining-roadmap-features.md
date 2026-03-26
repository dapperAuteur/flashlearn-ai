# FlashLearn AI - Remaining Roadmap Implementation Order

Last updated: 2026-03-25

---

## Priority 1: Marketing & Link Tracking (Switchy.io Integration)

**Branch stages (sequential):**

| # | Branch | Description | Status |
|---|--------|-------------|--------|
| 1 | `feat/switchy-core` | `lib/switchy.ts` + schema fields on 3 models + env vars | Pending |
| 2 | `feat/switchy-link-generation` | Fire-and-forget link creation on publish/share hooks | Pending |
| 3 | `feat/switchy-share-modals` | Share UIs prefer short URLs, fallback to full URL | Pending |
| 4 | `feat/switchy-admin-dashboard` | Admin `/admin/links` page with analytics + missing link counts | Pending |
| 5 | `feat/switchy-backfill` | Admin endpoint to backfill existing content with short links | Pending |
| 6 | `feat/switchy-roadmap-update` | Add Marketing & Link Tracking to public roadmap page | Pending |

**What it delivers:**
- Tracked short links on all versus challenges, public sets, and shared study results
- Marketing pixel tracking (Facebook, GA, TikTok, Twitter) on every shared link
- Admin dashboard for link analytics and backfill management
- UTM parameter passthrough for attribution tracking

---

## Priority 2: White-Label Starter App (In-Progress)

**Branch:** `feat/white-label-app`

- Next.js app powered entirely by the Public API
- Single-file branding config (name, colors, logo, feature toggles)
- Visual branding editor in admin dashboard
- SEO config editor for all page metadata
- One-click Vercel deploy button
- Open source — customize and extend freely

**Why next:** Revenue and distribution multiplier. Schools and companies deploy their own branded study app. Switchy integration means white-label deployments get link tracking built-in.

---

## Priority 3: Offline Conflict Resolution (Planned)

**Branch:** `feat/conflict-resolution`

- Side-by-side diff view for sync conflicts
- Keep Local / Keep Server / Merge options
- Offline indicator UI (persistent banner)
- Reconnection flash notification

**Why last:** Smallest user impact. Offline sync already works with queue-based approach; this is the polish layer for edge cases (same content edited on multiple devices while offline).
