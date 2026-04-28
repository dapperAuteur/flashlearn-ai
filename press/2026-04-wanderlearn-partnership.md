# PRESS RELEASE

## FlashLearn AI Powers Wanderlearn and BVC Classes: Spaced-Repetition and Mastery Tracking for High School Learners

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced that **Wanderlearn** and **Better Vice Club classes** (BVC) are the first products on its new Ecosystem API. Both use FlashLearn AI as the spaced-repetition and mastery-tracking layer behind their learner-facing experiences.

Wanderlearn ([wanderlearn.witus.online](https://wanderlearn.witus.online)) is an immersive 360-degree place-based learning experience for high school students (ages 13-19, grades 9-12). Students step into locations and learn by being there. After each location-anchored lesson, FlashLearn AI schedules a follow-up review deck for the next morning, tracks per-topic mastery, and dispatches a signed webhook back to Wanderlearn's analytics pipeline when the student plays the deck.

BVC (Better Vice Club) is BAM's curriculum on honest engagement with the everyday vices that run adult life: coffee, sugar, alcohol, screens, shopping, and the quiet ones nobody talks about. BVC classes are delivered via the Centenarian Academy LMS at [centenarianos.com/academy](https://centenarianos.com/academy), with a separate educator-pilot track at [witus.online/educators](https://witus.online/educators) for teachers running BVC packets in their classrooms. FlashLearn AI handles the spaced-repetition layer for BVC terminology, intervention-design vocabulary, and the endocannabinoid-system curriculum. The BVC Season 1 glossary (65 terms) is hosted at `/deck/bvc-season-1` and is now wired through the same Ecosystem API for scheduled per-student review and mastery tracking.

> [QUOTE: 1-2 sentence statement from BAM as founder of FlashLearnAI.WitUS.Online.]

### What Wanderlearn does

Wanderlearn is built around immersive 360-degree video and place-based learning. Students don't just read about a place. They step into it virtually, complete tasks anchored to specific locations, and answer comprehension prompts as they go. The learning has to stick. That's where FlashLearn AI comes in.

After a Wanderlearn lesson finishes, Wanderlearn calls `POST /api/v1/sessions` against the Ecosystem API. FlashLearn generates a 3-5 card review deck targeting the vocabulary and concepts from that lesson, schedules delivery for the next morning in the student's local timezone, and queues the delivery via Upstash QStash.

The next morning, the student plays the deck. Wanderlearn POSTs the attempts to FlashLearn. FlashLearn computes first-attempt correctness, updates the mastery rollup, and dispatches a `session.completed` webhook to Wanderlearn's analytics pipeline. The webhook becomes Wanderlearn's source-of-truth event log.

### What BVC classes do

BVC content runs in seasons and episodes. The flagship Better Vice Club core curriculum audits the vices that run a person's week and walks through designing interventions that hold up against ordinary life. Companion curricula cover Foundations of Fitness, Intervention Design, the Endocannabinoid System, and FDAC (the practitioner health course at [fdac.witus.online](https://fdac.witus.online)). Each season introduces vocabulary that builds across the term.

Without spaced repetition, students forget most of the terminology within a week. With it, terms stick. The BVC Season 1 glossary (65 terms) was already hosted on FlashLearnAI as a deck. The Ecosystem API now lets BVC class instructors and the educator-pilot teachers:

- Schedule a per-student review session after each class meeting
- Read each student's mastery state across the season's term set with one GET
- Run a cascade-delete when a student drops the class or completes the program

### What FlashLearn AI provides for both

The same four endpoints power both partners:

- `POST /api/v1/sessions` to schedule the review deck
- `POST /api/v1/sessions/:id/results` to submit raw attempts and receive the canonical `session.completed` payload synchronously
- `GET /api/v1/mastery/:childId` for per-topic rollup
- `DELETE /api/v1/children/:childId` for verifiable cascade-delete with an audit-log row

Plus signed `session.completed` webhooks (HMAC-SHA256, 7-attempt backoff over 24 hours, dead-letter, AES-256-GCM secret encryption at rest, self-service replay).

### Curriculum framework support

The Ecosystem API uses a `(framework, code)` tuple to tag sessions to curriculum standards. Indiana Kindergarten standards are seeded today as the reference framework. New frameworks load from a JSON file with the same shape via `npm run seed:standards`. Wanderlearn and BVC each map their lesson modules and episodes to a framework-specific code set. Adding additional state HS standards (Common Core, NGSS, AP topics, state-specific frameworks) follows the same pattern.

### Privacy posture

Both partners use an opaque consumer-issued `childId` (a string the consumer generates and maps to its own student-account record). FlashLearn stores no name, email, address, photo, or device identifier for the student. When a parent or eligible student invokes a privacy-rights deletion under FERPA or applicable state law, the consumer calls `DELETE /api/v1/children/:childId` and receives a 200 plus an audit-log receipt.

A WitUS-internal Data Processing Agreement covering processor and controller obligations is in legal review and will be signed before any external pilot launches.

### Why same-portfolio integrations first

Wanderlearn and BVC classes are the first products on the Ecosystem API for two reasons:

1. They're real WitUS-portfolio products with real launch deadlines. The API design was driven by their integration needs, not the other way around.
2. Same-portfolio iteration was safe during the build. The `tz` field on `POST /sessions` was added after Wanderlearn flagged that UTC midnight scheduling fires the Eastern-time evening, not the next morning. That's the kind of feedback you only get from a real consumer.

The Ecosystem API is now stable, documented, and open to additional partners. Other learning products targeting K-12 or higher ed can request an `fl_eco_` key by emailing [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com).

### About Wanderlearn

Wanderlearn is an immersive 360-degree place-based learning experience for high school students. Currently in development for launch via [wanderlearn.witus.online](https://wanderlearn.witus.online).

### About BVC

Better Vice Club (BVC) is BAM's curriculum on honest engagement with the everyday vices that run adult life. Delivered via the Centenarian Academy LMS at [centenarianos.com/academy](https://centenarianos.com/academy). The BVC stance: every vice has a real cost and a real reason; abstinence is a tool, not a virtue, and so is moderation; interventions that survive contact with ordinary life are the only ones worth running. Named curricula include BVC core, Foundations of Fitness, Intervention Design, the Endocannabinoid System curriculum, and FDAC. Teachers evaluating BVC for a classroom can apply to the educator pilot at [witus.online/educators](https://witus.online/educators).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, competitive study challenges, and a learner-scoped Ecosystem API for cross-product partners. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**FlashLearn AI:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**Wanderlearn:** [wanderlearn.witus.online](https://wanderlearn.witus.online)
**Ecosystem API docs:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
