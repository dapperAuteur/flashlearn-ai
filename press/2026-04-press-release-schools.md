# PRESS RELEASE

## FlashLearnAI.WitUS.Online Adds Ecosystem API for Schools and Districts: Cascade-Delete and Signed Webhooks for LMS / SIS Integration

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** Following the March 2026 launch of the Public API for Schools, FlashLearnAI.WitUS.Online today announced the **Ecosystem API**. This is an integration layer that lets schools, districts, and edtech vendors plug FlashLearn into their existing LMS or Student Information System (SIS) without exposing student PII to FlashLearn, complete with documented cascade-delete and HMAC-signed outbound webhooks for SIS callbacks.

The Ecosystem API is the second milestone in FlashLearn's roadmap for K-12. The original Public API (March 2026) gave schools the ability to generate AI flashcards, run spaced-repetition study, and create competitive quiz challenges. The Ecosystem API gives them a way to integrate that into the systems districts already run.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### What's new since March

The original Public API for Schools (announced March 2026) is now joined by:

- 4 new endpoints for learner-scoped session scheduling, mastery rollups, and cascade-delete (now **27 total** in the Public API)
- A new `fl_eco_` API key type. Admin-issued. Separate rate-limit tier. Dedicated to LMS / SIS / edtech-vendor integrations.
- Signed outbound webhooks. When a student completes a scheduled review, FlashLearn POSTs the result to your registered SIS callback URL with HMAC-SHA256 verification.
- Per-endpoint secret encryption with AES-256-GCM at rest. Plaintext shown once at registration. Rotation self-service.
- Self-service developer dashboard at [/developer/webhooks](https://flashlearnai.witus.online/developer/webhooks) for registering endpoints, viewing delivery history, and replaying dead-lettered deliveries.
- Public docs at [/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem) and [/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks) with copy-paste verification snippets.

### Why this matters for districts

Districts evaluating edtech vendors increasingly require:

1. A documented student-data deletion endpoint they can hit programmatically, not a support-ticket workflow.
2. A signed integration story so SIS / LMS callbacks can't be spoofed.
3. An audit trail for both deletions and outbound integrations.

The Ecosystem API ships all three as documented, tested primitives. The cascade-delete is covered by an end-to-end test in CI. Deleting a student purges sessions, attempts, mastery rollups, and decks across five collections, then writes an audit-log row.

### District use cases

**LMS integration (Canvas, Schoology, Google Classroom, etc.):**
- Teacher creates a unit in the LMS. The LMS calls `POST /api/v1/sessions` to schedule a 5-card review deck for each enrolled student the morning after the unit completes.
- FlashLearn generates cards keyed to the standard codes the teacher tagged the unit with.
- When students play the review, the LMS POSTs results back. FlashLearn dispatches a `session.completed` webhook to the gradebook integration.

**SIS integration (PowerSchool, Infinite Campus, Skyward, etc.):**
- New student enrollment triggers an SIS-initiated `POST /api/v1/sessions` for a baseline placement deck.
- Student withdrawal (transfer, graduation) triggers `DELETE /api/v1/children/:studentId` for verifiable purge with an audit receipt for the student's permanent record.

**Curriculum-mapped review:**
- Districts that have aligned curricula to state standards can pass the standard codes directly into `POST /api/v1/sessions`.
- Indiana Kindergarten standards are seeded in production today as the reference framework. Additional state frameworks load via a JSON upload (contact us for your state's framework).

### Why "Ecosystem" and not "Public" for districts

The Public API (`fl_pub_*` keys) is self-serve. Anyone can sign up and generate. The Ecosystem API (`fl_eco_*` keys) is admin-issued because it touches learner-scoped data and dispatches outbound webhooks. We vet integrations against student-privacy expectations before issuing a key. For most districts and edtech vendors integrating into an SIS or district LMS, the ecosystem path is the correct one.

### What's already in production

Two WitUS-portfolio products run on the Ecosystem API today:

- **Wanderlearn** ([wanderlearn.witus.online](https://wanderlearn.witus.online)). Immersive 360-degree place-based learning for high school students (ages 13-19, grades 9-12). Students step into locations and learn by being there.
- **Better Vice Club classes** (BVC). BAM's curriculum on honest engagement with everyday vices, delivered via Centenarian Academy LMS, with an educator-pilot track for K-12 teachers running BVC packets. FlashLearn AI handles spaced-repetition review of each season's term glossary.

Both are real, multi-month integrations. The same API contract is available for school district pilots.

### Updated pricing

API tiers cover both key types side by side. Schools can start on Free, scale to Developer or Pro as integration usage grows, and contact us for Enterprise.

| Tier | Price | Generations/mo (public / eco) | API Calls/mo (public / eco) | Burst/min (public / eco) |
|------|-------|------------------------------|----------------------------|-------------------------|
| Free | $0 | 100 / 1,000 | 1,000 / 10,000 | 10 / 60 |
| Developer | $19/mo | 5,000 / 10,000 | 50,000 / 100,000 | 60 / 120 |
| Pro | $49/mo | 25,000 / 50,000 | 250,000 / 500,000 | 120 / 300 |
| Enterprise | Custom | Unlimited | Unlimited | 300 / 600 |

For school district pilots requiring quotas above the Free tier during integration testing, we routinely override to Developer-tier limits at no charge. Email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) with your district name and integration scope.

### How to get started

1. Visit [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer) and create a free account.
2. For self-serve flashcard generation, click **New Key** to create a `fl_pub_` key. Same as the original Public API.
3. For LMS / SIS integration with cascade-delete, email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) with your district name and integration plan to request an `fl_eco_` key.
4. Read the integration docs at [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem) and [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, competitive study challenges, and a learner-scoped Ecosystem API for school districts and edtech partners. 27 documented REST endpoints. OpenAPI 3.1 spec at [/api/v1/openapi](https://flashlearnai.witus.online/api/v1/openapi). Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**Developer Portal:** [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer)
**Ecosystem API docs:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
**Webhook reference:** [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks)
**Interactive API reference (all 27 endpoints):** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Original March 2026 schools release:** [press/press-release-schools.md](press-release-schools.md)
