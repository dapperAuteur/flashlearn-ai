# PRESS RELEASE

## FlashLearn AI Powers Wanderlearn Stories — A 360° Indiana Kindergarten Learning Experience for Ages 4-7

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State] — April 2026** — FlashLearnAI.WitUS.Online today announced that **Wanderlearn Stories**, a new immersive learning experience for ages 4-7 mapped to Indiana Kindergarten Academic Standards, is the first product running on FlashLearn's new **Ecosystem API**. Every spaced-repetition deck, comprehension check, and parent-facing mastery report inside Wanderlearn Stories is generated, scheduled, and measured by FlashLearn AI behind the scenes — letting Wanderlearn focus entirely on the storytelling and play experience kids actually see.

> [QUOTE: 1–2 sentence statement from BAM as founder of FlashLearnAI.WitUS.Online — e.g., why a sister product is the right first ecosystem partner.]

### What Wanderlearn Stories does

Wanderlearn Stories takes an Indiana kindergartner through a 360° learning hub — story, song, video, hands-on activity — built around a specific kindergarten standard (e.g., `K.NS.1` "Count by ones and tens" or `K.RL.1` "Ask and answer questions about a story"). After the child completes a hub, the experience is supposed to *stick*. That's where FlashLearn AI comes in.

### What FlashLearn AI provides

The morning after a child completes a Wanderlearn hub, the family receives a 3-5 card review deck targeting the same standards. Behind that simple parent-facing experience is the full FlashLearn Ecosystem API:

- **`POST /api/v1/sessions`** — Wanderlearn calls this on hub completion. FlashLearn generates the deck against the cited standards, schedules delivery for the next morning in the parent's local timezone (`America/Indiana/Indianapolis` for the Indiana pilot), and queues the delivery via Upstash QStash.
- **Curriculum-tagged generation** — Wanderlearn passes `framework: "indiana-k"` and a list of standard codes; FlashLearn validates against the seeded Indiana K standards library and generates age-appropriate cards.
- **`GET /api/v1/mastery/:childId`** — Wanderlearn's parent dashboard reads this to show per-standard progress: which standards the child has been *exposed* to, *practiced*, or *demonstrated* mastery of (≥80% first-attempt correct over the last 5 attempts).
- **Signed `session.completed` webhooks** — When the family plays a deck, Wanderlearn POSTs the attempts to FlashLearn; FlashLearn computes first-attempt correctness, updates the mastery rollup, and dispatches a HMAC-SHA256-signed webhook back to Wanderlearn's analytics pipeline. The webhook becomes Wanderlearn's source-of-truth event log.
- **`DELETE /api/v1/children/:childId`** — When a parent invokes their COPPA delete right, one Wanderlearn API call cascades through every FlashLearn collection touching that child's data — sessions, attempts, mastery rollups, generated decks, queued webhook deliveries — and writes an audit-log receipt. Idempotent.

### Indiana Kindergarten alignment, by the numbers

The seeded Indiana K standards library covers the core kindergarten domains:

- **K.NS.1–K.NS.4** — Number sense (counting, writing 0–20, one-to-one correspondence, group comparison)
- **K.CA.1–K.CA.2** — Computation & algebra (addition/subtraction within 10, decomposing numbers)
- **K.G.1** — Geometry (plane and solid shapes)
- **K.RL.1–K.RL.3** — Reading literature (story comprehension, retelling, characters/settings/events)
- **K.RF.1–K.RF.2** — Reading foundations (print concepts, phonological awareness)
- **K.W.1** — Writing (opinion pieces with drawing/dictation/writing)
- **K.SL.1** — Speaking & listening (collaborative conversations)

Wanderlearn Stories tags every hub to one or more of these. FlashLearn validates standard codes on every session create — invalid codes return a `400 INVALID_INPUT` with the offending code in `details`, so consumers never wind up with sessions tagged to nonexistent curriculum entries.

### Privacy posture

Wanderlearn was deliberately designed with no FlashLearn-side PII. The integration uses an **opaque consumer-issued `childId`** (a string Wanderlearn generates and maps to its own parent-consent record). FlashLearn stores no name, email, address, photo, voice, or device identifier for the child. When a parent invokes COPPA deletion, Wanderlearn calls `DELETE /api/v1/children/:childId` and receives a 200 + audit receipt — verifiable proof of purge.

A formal Data Processing Agreement between WitUS entities is on file even though both products share ownership; the audit trail matters for parent and school trust.

### Why a same-ownership integration first

Wanderlearn Stories is the first integration on the Ecosystem API for two reasons:

1. **It's a real product with a real launch deadline.** The Indiana pilot drove the API design, not the other way around.
2. **It validates the contract end-to-end.** Same ownership made it safe to iterate on the API shape during the build (e.g., the `tz` field on `POST /sessions` was added after Wanderlearn flagged that UTC midnight scheduling fires the Eastern-time evening, not next morning).

The Ecosystem API is now stable, documented, and open for additional partners. Other consumer-facing learning products targeting K-12 — particularly products serving children where COPPA cascade-delete and curriculum-tagged sessions matter — can request an `fl_eco_` key by emailing [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com).

### About Wanderlearn Stories

Wanderlearn Stories is a 360° immersive learning experience for ages 4-7 mapped to Indiana Kindergarten Academic Standards. Currently in Indiana pilot. Learn more at [stories.wanderlearn.witus.online](https://stories.wanderlearn.witus.online).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, competitive study challenges, and now a child-scoped Ecosystem API for cross-product partners. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**FlashLearn AI:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**Wanderlearn Stories:** [stories.wanderlearn.witus.online](https://stories.wanderlearn.witus.online)
**Ecosystem API docs:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
