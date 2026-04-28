# PRESS RELEASE

## FlashLearnAI.WitUS.Online Updated for Medical Students: 27 Endpoints, Ecosystem Integrations, and the Same Spaced-Repetition Backend

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** This release refreshes the [March 2026 Medical Education announcement](press-release-med-students.md) with the current state of the FlashLearnAI.WitUS.Online platform. The Public API has grown from 23 to 27 documented REST endpoints. A new Ecosystem API surface lets institutional partners integrate FlashLearn AI as a deeper backend for their own learning products. The core medical-education use case described in the original release is unchanged and now sits on a more capable platform.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### What's the same as March

Everything in the original Medical Education release still works:

- AI flashcard generation from any medical topic (pharmacology, pathology, anatomy, biochemistry, USMLE topics)
- SM-2 spaced repetition with per-card scheduling
- Versus Mode for study-group challenges (composite scoring: accuracy 40%, speed 25%, confidence 20%, streak 15%)
- AI answer grading that handles drug-name typos and equivalent terminology

### What's new since March

- **4 new endpoints** for the Ecosystem API: child-scoped session scheduling (relevant to pediatric programs and medical-education residencies serving minors), per-standard mastery rollups, signed outbound webhooks, and idempotent cascade-delete for student records on rotation transfers or graduation.
- **A new `fl_eco_` API key type** for residency programs and medical schools that want a deeper integration than the standard `fl_pub_` key offers.
- **Signed outbound webhooks** for residency program directors who want to ingest study completion events into their existing program-management software (HMAC-SHA256, 7-attempt retry, dead-letter dashboard).
- **Public docs** at [/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem) and [/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks).
- **Updated changelog** at [/changelog](https://flashlearnai.witus.online/changelog) with the full feature list since March.

### When the new endpoints matter for medical education

Most med-student users won't need the Ecosystem API. The original Public API generation, study, and Versus endpoints cover individual study, study-group challenges, and per-card analytics.

The Ecosystem API matters when you're building:

- **A residency program's longitudinal study tracker.** Use `POST /sessions` to schedule resident review on a curriculum-tagged cadence (e.g., weekly cardiology drills).
- **A medical-school course platform** that wants to embed spaced-repetition review into its LMS without managing the AI pipeline. Sign up for an `fl_eco_` key, integrate the four endpoints, ship in roughly 2 days.
- **A board-prep startup** that wants to differentiate on retention measurement, not content generation. The mastery rollup endpoint surfaces per-topic mastery state for a learner across the board exam blueprint.

### Pricing

Unchanged from March:

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

Free tier still covers an individual med student's daily study load.

### Getting started

1. If you signed up in March, your account and `fl_pub_` keys still work. Skip to step 3.
2. New users: sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer).
3. Generate your first med-school flashcards in under 60 seconds.
4. For institutional integration (residency programs, medical schools, board prep companies), email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) to request an `fl_eco_` ecosystem key.

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, competitive study challenges, and a learner-scoped Ecosystem API. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Original March 2026 release:** [press/press-release-med-students.md](press-release-med-students.md)
