# PRESS RELEASE

## FlashLearnAI.WitUS.Online Launches Ecosystem API for Cross-Product Learning Partners

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today launched its **Ecosystem API**, a four-endpoint REST surface that lets any consumer-facing learning product use FlashLearn AI as its spaced-repetition and comprehension-measurement backend. The API ships with a dedicated `fl_eco_` key type, learner-scoped data isolation, signed outbound webhooks, and a single-call cascade-delete that purges every byte of learner-derived data across five collections.

Building consumer-facing learning products requires solving three hard problems. Quality content generation. Scientifically scheduled review. Student-data compliance. The Ecosystem API handles all three behind one Bearer token so product teams can ship in days instead of quarters.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### What the Ecosystem API ships

- `POST /api/v1/sessions` schedules a learner-scoped review deck against curriculum standards. Indiana Kindergarten standards are seeded as the reference framework. New frameworks load from a JSON file with the same shape via the `npm run seed:standards` script. The endpoint accepts an IANA `tz` field so the deck delivers at next local midnight in the family's timezone instead of UTC.
- `POST /api/v1/sessions/:sessionId/results` accepts raw card attempts. The response body matches the canonical `session.completed` webhook payload exactly, so consumers can update UI synchronously and treat the webhook as audit confirmation.
- `GET /api/v1/mastery/:childId` returns a per-standard rollup with three states: `exposed`, `practiced`, `demonstrated`. Promotion to `demonstrated` requires at least 80 percent first-attempt correct over the last 5 first-attempts and is sticky.
- `DELETE /api/v1/children/:childId` runs a cascade-delete across sessions, attempts, mastery rollups, decks, and queued webhooks. It is idempotent. Re-calling after a prior purge returns 200 with `purgedRecordCount: 0`. The endpoint is documented at [/docs/api/children](https://flashlearnai.witus.online/docs/api/children).

### Signed outbound webhooks

When a session completes, FlashLearn POSTs the result to a consumer-registered URL with a full HMAC-SHA256 signature scheme:

- `X-FlashLearn-Signature: sha256=<hex>` over the raw body
- `X-FlashLearn-Delivery: <UUID>` for idempotent retry handling
- `X-FlashLearn-Event` and `X-FlashLearn-Timestamp` for replay protection
- 7 attempts over roughly 24 hours at 1m / 5m / 30m / 2h / 6h / 16h
- Dead-letter on attempt 7. Auto-disable an endpoint after 50 consecutive failures.
- AES-256-GCM encryption at rest for per-endpoint signing secrets
- Self-service registration, secret rotation, delivery history, and manual replay at [/developer/webhooks](https://flashlearnai.witus.online/developer/webhooks)

### What no other flashcard API bundles

Most flashcard tools target individual learners. Most learning-platform APIs stop at content generation. The Ecosystem API is the first one we know of to bundle:

1. AI generation keyed to curriculum standards
2. Spaced repetition (SM-2) with per-card scheduling
3. Mastery measurement at the standard level (not just per card)
4. Cascade-delete as a documented, idempotent, audit-logged first-class endpoint
5. Signed webhooks with retry, dead-letter, and self-service replay

All behind one `fl_eco_` key, in one integration.

### First in production: Wanderlearn and Better Vice Club classes

Two products in the WitUS portfolio are the first ecosystem partners to integrate.

**Wanderlearn** ([wanderlearn.witus.online](https://wanderlearn.witus.online)) is immersive 360-degree place-based learning for high school students (ages 13-19, grades 9-12). Students step into locations and learn by being there. After a Wanderlearn lesson finishes, Wanderlearn calls `POST /sessions` to schedule a 3-5 card review deck for the next morning in the student's local timezone.

**Better Vice Club classes** (BVC) is BAM's curriculum on honest engagement with the everyday vices that run adult life: coffee, sugar, alcohol, screens, shopping. Delivered via the Centenarian Academy LMS at [centenarianos.com/academy](https://centenarianos.com/academy), with a separate educator-pilot track at [witus.online/educators](https://witus.online/educators) for classroom adaptations. FlashLearn AI handles spaced repetition for BVC vocabulary and intervention-design concepts. The BVC Season 1 glossary (65 terms) at `/deck/bvc-season-1` is now wired through the Ecosystem API.

Both partners get the same API contract: schedule a deck, receive results back as a signed webhook, read mastery from one endpoint, run a cascade-delete from one endpoint when a student withdraws or a parent invokes a privacy right.

### Pricing

The Ecosystem key type (`fl_eco_`) has its own tier table separate from the public-developer (`fl_pub_`) tier:

| Tier | Price | Generations/mo | API Calls/mo | Burst/min |
|------|-------|---------------|--------------|-----------|
| Free | $0 | 1,000 | 10,000 | 60 |
| Developer | $19/mo | 10,000 | 100,000 | 120 |
| Pro | $49/mo | 50,000 | 500,000 | 300 |
| Enterprise | Custom | Unlimited | Unlimited | 600 |

Ecosystem keys are admin-issued. Partners contact FlashLearn AI directly for provisioning. This lets us vet integrations against the data-handling expectations the API design assumes from consumers.

### How to get started

1. Read the developer guide at [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem) and the webhook reference at [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks).
2. Email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) to request an `fl_eco_` key.
3. Wire `POST /sessions` into your product on the event you want to trigger review (lesson finish, episode complete, assessment submit). Estimated integration time: about 2 days.

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. The Ecosystem API extends the existing 27-endpoint Public API with a learner-scoped surface for cross-product partners. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**Ecosystem API docs:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
**Webhook reference:** [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks)
**Interactive API reference (all 27 endpoints):** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
