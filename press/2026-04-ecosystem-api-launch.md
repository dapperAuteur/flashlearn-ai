# PRESS RELEASE

## FlashLearnAI.WitUS.Online Launches Ecosystem API — First COPPA-Compliant Spaced-Repetition Backend for Consumer Learning Products

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State] — April 2026** — FlashLearnAI.WitUS.Online today launched its **Ecosystem API**, a four-endpoint surface that lets any consumer-facing learning product use FlashLearn AI as its spaced-repetition + comprehension-measurement backend. Built specifically for COPPA-conscious products serving children, the API ships with a dedicated `fl_eco_` key type, child-scoped data isolation, signed outbound webhooks, and a single-call cascade-delete that purges every byte of child data across five collections.

Building consumer-facing learning products requires solving three hard problems: quality content generation, scientifically-scheduled review, and child-data compliance. The Ecosystem API handles all three behind one REST surface, so product teams can ship in days instead of quarters.

> [QUOTE: 1–2 sentence statement from BAM as founder — e.g., why we built this and what's possible now.]

### What the Ecosystem API ships

- **`POST /api/v1/sessions`** — Schedule a child-scoped review deck against curriculum standards (Indiana Kindergarten standards seeded; framework-extensible). Accepts `tz` (IANA) so the deck delivers at next local midnight in the family's timezone, not UTC.
- **`POST /api/v1/sessions/:sessionId/results`** — Submit raw card attempts. The response body mirrors the canonical `session.completed` webhook payload exactly, so consumers can update UI synchronously and treat the webhook as audit confirmation.
- **`GET /api/v1/mastery/:childId`** — Per-standard mastery rollup with three states: `exposed` → `practiced` → `demonstrated` (≥80% over the last 5 first-attempts; sticky once reached).
- **`DELETE /api/v1/children/:childId`** — COPPA cascade-delete. One call purges sessions, attempts, mastery rollups, decks, and queued webhooks across every collection that holds child-derived data. Idempotent; returns a 200 with `purgedRecordCount: 0` on re-delete after a prior purge.

### Signed outbound webhooks

When a session completes, FlashLearn POSTs the result to a consumer-registered URL with a full HMAC-SHA256 signature scheme:

- `X-FlashLearn-Signature: sha256=<hex>` over the raw body
- `X-FlashLearn-Delivery: <UUID>` for idempotent retry handling
- `X-FlashLearn-Event` and `X-FlashLearn-Timestamp` for replay protection
- 7-attempt exponential backoff over ~24 hours (1m / 5m / 30m / 2h / 6h / 16h)
- Dead-letter on attempt 7; auto-disable endpoint after 50 consecutive failures
- AES-256-GCM encryption-at-rest for per-endpoint signing secrets
- Self-service registration, secret rotation, delivery history, and manual replay at [/developer/webhooks](https://flashlearnai.witus.online/developer/webhooks)

### Why this is novel

Most flashcard tools target individual learners. Most learning-platform APIs stop at content generation. The Ecosystem API is the first to bundle:

1. **AI generation** keyed to curriculum standards
2. **Spaced repetition** (SM-2) with per-card scheduling
3. **Mastery measurement** at the standard level (not just per-card)
4. **COPPA cascade-delete** as a documented, idempotent first-class endpoint
5. **Signed webhooks** with retry, dead-letter, and self-service replay

…all behind one Bearer token, with one `fl_eco_` key, in a single integration.

### First in production: Wanderlearn Stories

Wanderlearn Stories, a 360° immersive learning experience for ages 4-7 mapped to Indiana Kindergarten standards, is the first product running on the Ecosystem API. After a child completes a Wanderlearn hub, Wanderlearn calls `POST /sessions` to schedule a 3–5 card review deck for the next morning. When the family plays the deck, Wanderlearn POSTs the attempts back; FlashLearn normalizes them, updates the mastery rollup, and dispatches a `session.completed` webhook to Wanderlearn's parent dashboard.

### Pricing

The Ecosystem key type (`fl_eco_`) has its own tier table separate from the public-developer (`fl_pub_`) tier:

| Tier | Price | Generations/mo | API Calls/mo | Burst/min |
|------|-------|---------------|--------------|-----------|
| Free | $0 | 1,000 | 10,000 | 60 |
| Developer | $19/mo | 10,000 | 100,000 | 120 |
| Pro | $49/mo | 50,000 | 500,000 | 300 |
| Enterprise | Custom | Unlimited | Unlimited | 600 |

Ecosystem keys are admin-issued — partners contact FlashLearn AI directly for provisioning. This lets us vet integrations against the COPPA / data-handling expectations the API design assumes from consumers.

### How to get started

1. Read the developer guide at [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem) and the webhook reference at [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks).
2. Email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) to request an `fl_eco_` key.
3. Wire `POST /sessions` into your product on the event you want to trigger review (e.g., hub completion, lesson finish, assessment submit). Estimated integration time: ~2 days.

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. The Ecosystem API extends the existing 27-endpoint Public API with a child-scoped, COPPA-compliant surface for cross-product partners. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**Ecosystem API docs:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
**Webhook reference:** [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks)
**Interactive API reference (all 27 endpoints):** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
