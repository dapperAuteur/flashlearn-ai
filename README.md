# FlashLearnAI.WitUS.Online

AI-powered flashcard platform with spaced repetition, versus mode, and offline-first architecture.

**Live:** [flashlearnai.witus.online](https://flashlearnai.witus.online)

## Features

- **AI Generation.** Create flashcards from topics, PDFs, YouTube videos, audio files, and images (OCR).
- **Spaced Repetition.** SM-2 algorithm schedules reviews at optimal intervals.
- **3 Study Modes.** Classic flip cards, multiple choice, type-your-answer with AI grading.
- **Rich cards.** Authored multiple-choice options (scored by option id) and images or video on either side with alt text, so a set can ask "identify the image" questions. Set owners attach card images from My Flashcards (the photo button on a set opens a per-card editor); partners set them through the API. Both paths upload through the same Cloudinary-backed helper with the same 10MB image cap, and either can point at a partner CDN URL instead. Alt text is required on every uploaded image, because the study player reads it out.
- **Curated math library.** Repo-authored sets, loaded by `npm run seed:math`: every single-digit addition, subtraction, multiplication, and division fact, split into small sets so a student can drill one number at a time, plus geometry, trigonometry, and calculus reference sets. Fact cards carry authored multiple-choice answers, so math practice costs no AI generations.
- **Your library.** A personal shelf of the sets you actually use, and the first thing on the dashboard when you sign in. Add any public set from Explore or from a set's own page, and anything you create lands there automatically. The shelf points at the set rather than copying it, so corrections to a public set reach everyone who keeps it, and removing a set leaves your progress alone: add it back and the streak picks up where it left off. Sorted by what you studied most recently, then by what you added most recently. No limit on how many sets you keep.
- **Set ratings.** Signed-in learners rate any public set one to five stars. A rating is one document per person per set, so changing your mind updates your existing star instead of stacking a second vote, and the running average and rater count live on the set so Explore can sort by "Highest rated" without a per-set query. Authors cannot rate their own sets.
- **Versus Mode.** Head-to-head challenges with composite scoring (accuracy, speed, confidence, streaks) and ELO ratings.
- **Offline study.** Sets you own are copied to a local SQLite store on app start, on reconnect, and every five minutes, so you can study them with no connection. Card images, alt text, video, and authored answer choices come down with them. Results are held in IndexedDB and upload when the connection returns, which is when the spaced-repetition schedule advances. The copy runs one way, server to device: sets edited offline and public sets you do not own are not covered.
- **Teams & Classrooms.** Study groups with join codes, shared sets, team chat, and teacher-led classrooms. When the owner deletes their account, the group or classroom is archived rather than removed: it stays in members' listings marked as archived, members keep reading and studying what is already there, a banner at the top of the page says why, and every write is refused with a 409 until an admin reassigns it. Leaving and deleting still work.
- **Teacher-managed student accounts.** A teacher adds a student to a classroom by name and nothing else: no email address, no signup, no second device. The student gets a real account, so study sessions, card results, achievements, and the SM-2 schedule attach to them exactly as they would for anyone who signed themselves up. The account carries no password and is refused at both sign-in paths, and its address sits in the reserved `.invalid` TLD (RFC 2606), so it can never resolve or receive mail. Creating the student returns a claim code shown once. The student later enters that code with their own email and password, and the account becomes theirs keeping every session and every review date, because the user id never changes. A teacher can only manage students in a classroom they teach, checked against the classroom rather than the role, and cannot set a student's password anywhere: a teacher who could would be indistinguishable from the student in the proctoring audit trail. Removing a student from a roster unenrols them and leaves the account alone. The roster lives on the classroom page, where **Start session** on a student's row opens study with that student already chosen and says so before a set is picked. Students claim their account at `/claim`, which needs no sign-in because they have never had one. The routes live under `/api/teacher` and are authenticated by browser session, so they are app routes rather than part of the public v1 API and do not appear in the OpenAPI spec. Adding students one at a time is the whole of it; there is no bulk import, and managed students have no avatar or PIN sign-in.
- **Public API.** A REST API for building on top of FlashLearnAI, including card media upload and per-student progress for partners.
- **Ecosystem API for cross-product partners.** Spaced-repetition and comprehension backend for any consumer-facing learning product. Learner-scoped scheduled sessions, per-standard mastery rollups, cascade-delete, and signed outbound webhooks. Powers Wanderlearn and BVC classes.
- **Signed outbound webhooks.** HMAC-SHA256 signed callbacks with 7-attempt exponential backoff, dead-letter, AES-256-GCM secret encryption at rest, and a self-service developer dashboard with replay.
- **White-label app.** Branded study platform for schools and companies (sold separately).
- **Marketing & link tracking.** Switchy.io short links with pixel attribution on all shared content.
- **Admin dashboard.** Revenue analytics, user management, content moderation, promo campaigns, SEO tools.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Database:** MongoDB Atlas, Mongoose
- **Auth:** NextAuth.js with JWT sessions
- **Payments:** Stripe (subscriptions + metered billing)
- **Email:** Mailgun, Resend
- **AI:** Switchable provider layer ([`lib/ai/`](./lib/ai/)) via the Vercel AI SDK. `LLM_PROVIDER` selects the text backend: Cerebras (default), OpenRouter, Mistral, Together, or Google Gemini. Image generation uses a vision provider (default Mistral `mistral-small`); audio stays on Gemini.
- **Offline:** PowerSync (SQLite via wa-sqlite) as a local read cache, IndexedDB for study results and the upload queue
- **Rate Limiting:** Upstash Redis
- **Background Jobs:** Upstash QStash (delayed delivery + webhook retries)
- **Error Monitoring:** Better Stack via the Sentry SDK ([`lib/sentry-scrub.ts`](./lib/sentry-scrub.ts) scrubs emails, cookies, auth headers, and token-bearing URLs before an event is sent). Inert unless a DSN is set. [`app/global-error.tsx`](./app/global-error.tsx) is the last-resort boundary for errors thrown by the root layout itself: it renders its own `<html>`/`<body>`, reports the error, and offers a retry. Keep it dependency free and inline styled, since anything it imports could be the thing that broke.
- **Hosting:** Vercel
- **Link Tracking:** Switchy.io

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database
- Mailgun account

### Setup

```bash
git clone https://github.com/dapperAuteur/flashlearn-ai.git
cd flashlearn-ai
cp .env.sample .env.local  # Configure your environment variables
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Key Environment Variables

See [`.env.sample`](./.env.sample) for the full annotated set. Required minimums for local dev:

```env
MONGODB_URI=                          # MongoDB connection string
NEXTAUTH_SECRET=                      # openssl rand -base64 32
NEXTAUTH_URL=                         # http://localhost:3000
LLM_PROVIDER=cerebras                 # Text AI backend: cerebras | openrouter | mistral | together | gemini
CEREBRAS_API_KEY=                     # Key for the selected LLM_PROVIDER (CEREBRAS_/OPENROUTER_/MISTRAL_/TOGETHER_API_KEY)
LLM_VISION_PROVIDER=mistral           # Provider for image flashcards (text-only providers can't accept images)
GEMINI_API_KEY_PUBLIC=                # Google Gemini key, still required for audio flashcards + as fallback
UPSTASH_REDIS_REST_URL=               # Rate limiting + webhook milestone dedupe
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=                    # Stripe secret key
MAILGUN_API_KEY=                      # Mailgun API key
MAILGUN_DOMAIN=                       # Your Mailgun domain
SWITCHY_API_TOKEN=                    # Switchy.io API token
SWITCHY_DOMAIN=                       # Custom short link domain
CRON_SECRET=                          # openssl rand -hex 32 (for Vercel Cron)
```

Required for ecosystem outbound webhooks and delayed session scheduling:

```env
WEBHOOK_ENCRYPTION_KEY=               # openssl rand -hex 32 (AES-256-GCM key for per-endpoint signing secrets)
UPSTASH_QSTASH_TOKEN=                 # Upstash QStash publishing token
UPSTASH_QSTASH_CURRENT_SIGNING_KEY=   # For verifying QStash callbacks
UPSTASH_QSTASH_NEXT_SIGNING_KEY=      # For zero-downtime signing-key rotation
```

Optional, for error monitoring. Leave unset and the SDK never initializes:

```env
SENTRY_DSN=                           # Better Stack ingest DSN (server + edge runtimes)
NEXT_PUBLIC_SENTRY_DSN=               # Same DSN for the browser; must be set at BUILD time (CSP)
SENTRY_ENVIRONMENT=                   # Optional label; defaults to VERCEL_ENV, then NODE_ENV
SENTRY_ORG=                           # Build-time only, for source-map upload (readable traces)
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

## Health Check

`GET /api/health` is the endpoint to point an uptime monitor at (Better Stack, Pingdom, etc). Do not
monitor the homepage: it can answer 200 from cache while the database is down, so a green check there
proves nothing.

Every request pings MongoDB, so the status code reflects the app's critical dependency:

| Status | Body |
|--------|------|
| 200 | `{"ok":true,"checks":{"db":"ok"}}` |
| 503 | `{"ok":false,"error":"database_unreachable","checks":{"db":"fail"}}` |

Notes:

- Public and unauthenticated, and deliberately says nothing else. No version, no env values, no
  counts, no user data, and never the underlying error (a Mongo failure commonly carries the
  connection URI including the password), only the fixed `database_unreachable` token.
- Never cached (`Cache-Control: no-store`).
- Bounded by a 4 second timeout, so a hung database returns 503 quickly instead of hanging the check.
- Checks the database only. No AI provider or other third-party API is called, so a vendor outage
  cannot turn the uptime monitor red.

## Observability & E2E

Error monitoring (Better Stack via the Sentry SDK, inert unless a DSN is set) is covered under
[Tech Stack](#tech-stack) and the optional `SENTRY_*` block in
[Key Environment Variables](#key-environment-variables). The rest of the observability story:

### Distributed tracing

Traces go to **Honeycomb** over OTLP via `@vercel/otel` ([`otel.config.ts`](./otel.config.ts),
loaded from [`instrumentation.ts`](./instrumentation.ts) **before** the Sentry configs, because whoever
registers the global tracer provider first wins, and Sentry is told to stand down via
`skipOpenTelemetrySetup` in `sentry.server.config.ts`). Service name is **`flashlearnai`**.

- **Inert until the key is set.** `HONEYCOMB_INGEST_API_KEY_SECRET` (fallback `HONEYCOMB_API_KEY`).
  With neither set, registration is skipped entirely, the same leave-unset-and-nothing-initializes
  pattern as the Sentry DSN.
- **`/api/health` spans are dropped at the sampler.** Uptime monitors probe it around the clock,
  and those requests must not spend Honeycomb's free-tier event budget. Everything else is recorded
  unsampled.

### Unit test + type-check CI

[`.github/workflows/test.yml`](./.github/workflows/test.yml) runs `tsc --noEmit` and `npm test` as
two named steps on every push and pull request, so a failure says which gate broke. It needs no
secrets, database, or env: the suite is self-contained and the few tests that need a value set it
themselves.

Kept separate from the e2e gate below because that one triggers on `deployment_status`, meaning it
only fires after Vercel finishes a deploy. Unit tests should fail before a deploy, not after.

Two things worth knowing if you touch [`jest.config.js`](./jest.config.js):

- The config is an **async function**, not a plain object. `next/jest` hardcodes its own
  `node_modules` ignore pattern and only appends yours, and because `transformIgnorePatterns` is an
  OR, next/jest's pattern always matches first. Appending an allowlist to it is dead config. We
  resolve next/jest's config and then replace the array outright, which is what actually gets the
  ESM-only packages compiled.
- Add ESM-only packages to the `esmPackages` array, not to `transformIgnorePatterns` directly.

### E2E + accessibility CI

Playwright specs live in [`e2e/`](./e2e/); the gate runs in
[`.github/workflows/e2e.yml`](./.github/workflows/e2e.yml) on `deployment_status`. It tests the
**real Vercel deployment URL** (preview → full suite, production → `@smoke` only), so CI needs no
secrets, database, or env. The suite runs desktop plus a 360px mobile project, and covered pages
must pass an axe check with **zero serious or critical violations**. Minor and moderate findings are
reported but don't gate. The gate is strict on purpose; fix the page, not the gate.

- Local runs: `PLAYWRIGHT_BASE_URL=<url> npx playwright test`. Local runs drive installed Chrome
  via `channel: "chrome"` (Playwright's bundled chromium doesn't support macOS 13); CI uses the
  bundled browser.
- If the Vercel project enables Deployment Protection, set the project's "Protection Bypass for
  Automation" secret as the `VERCEL_AUTOMATION_BYPASS_SECRET` Actions secret; public previews need
  nothing.

### Synthetic traffic tag

Every request Playwright makes, the CI gate and tutorial recordings alike, carries
`x-witus-origin-test: playwright-synthetic` (an `extraHTTPHeaders` entry in both Playwright
configs). The OTel layer surfaces it as the **`witus.origin_test`** span attribute
(`attributesFromHeaders` in [`otel.config.ts`](./otel.config.ts)), so Honeycomb queries can include
or exclude synthetic traffic. Absent header = attribute absent = real user; queries about real
users exclude the attribute.

### Tutorial pipeline (tutorial-as-test)

Every user-facing tutorial is a **runnable Playwright spec** in
[`e2e/tutorials/`](./e2e/tutorials/) (`*.tutorial.ts`, driven by the helper in
[`e2e/tutorials/tutorial.ts`](./e2e/tutorials/tutorial.ts)), so a tutorial that no longer matches
the app **fails**, instead of quietly rotting as prose:

```bash
npm run tutorial:record   # run the specs via playwright.tutorial.config.ts → video + step marks
npm run tutorial:docs     # generate per-step markdown walkthroughs into docs/tutorials/
npm run tutorial:video    # compose the narrated video from recordings + narration audio
```

Auth-gated tutorials **skip** (never fail) unless `TUTORIAL_STORAGE_STATE` points at a signed-in
Playwright storage state (e.g. `.auth/tutorial-user.json`). The generated walkthroughs are
**committed** at [`docs/tutorials/`](./docs/tutorials/); recordings, step marks, narration audio,
storage states, and composed video are gitignored (`tutorial-output/`, `audio/`, `.auth/`,
`docs/tutorials/video/`). The per-step narration master lives in the witus repo at
`plans/31-tutorial-narration-scripts.md`.

## Curated content seeds

Two seed scripts load repo-authored content into MongoDB. Both are idempotent, so re-running after
an edit updates rows in place instead of duplicating them.

```bash
npm run seed:standards                                   # curriculum standards from lib/data/standards/
npm run seed:math -- --owner-email=you@example.com --dry-run
npm run seed:math -- --owner-email=you@example.com
```

`seed:math` creates the math library: **134 sets, 1,838 cards**. Every set holds 10 to 20 cards.

| Area | Sets | Cards |
|------|------|-------|
| Addition, per number | 22 | 242 |
| Subtraction, by what you take away | 11 | 121 |
| Subtraction, by what you take from | 9 | 121 |
| Multiplication, per number | 22 | 242 |
| Division, per divisor | 10 | 110 |
| Patterns (doubles, ways to make 10, squares) | 3 | 33 |
| Mixed review, all four operations | 12 | 180 |
| Geometry | 14 | 256 |
| Trigonometry | 14 | 256 |
| Calculus | 17 | 277 |

- Math fact sets hold 11 cards, one focus number crossed with 0 through 10. Addition and
  multiplication get two sets per number, one for each position of that number in the problem
  (`1 + 0 to 1 + 10` and `0 + 1 to 10 + 1`), so recall is drilled in both directions. Subtraction and
  division are the exact inverses, so every answer is a whole number from 0 to 10.
- Fact cards are generated by `lib/data/math-facts.ts` and carry a question and an answer only. They
  used to ship authored multiple-choice options, which were removed because fact fluency is recall:
  picking 49 out of four numbers is an easier task than producing 49, and a card cleared that way
  would still tell the scheduler it is mastered. The study setup screen turns Multiple Choice off for
  any set tagged `math-facts`.
- Reference content is authored JSON in `lib/data/math-reference/`. Edit it without touching
  TypeScript; `lib/data/math-reference/loadSets.ts` validates set size, duplicate questions, and
  characters the card renderer would read as markup.
- `--owner-email` is required and the account must already exist. The script will not guess which
  account owns public sets. `--dry-run` reports changes without writing, `--only=<slug prefix>` seeds
  a slice, `--private` keeps the sets unlisted, and `--feature` marks them featured on Explore
  (skip it unless you want all 65 fact sets pinned).

Cards are matched on a stable `externalId`, so a re-seed preserves card `_id`s and every student's
review history survives a content edit.

## Pricing

| Plan | Price |
|------|-------|
| Free | $0 (limited AI generations) |
| Monthly Pro | $10.60/month |
| Lifetime Learner | $103.29 one-time (first 100 users) |

### API Tiers

Two key types share the tier table. Choose based on your use case:

- **Public** (`fl_pub_`). For apps building on top of FlashLearnAI (study apps, LMS integrations).
- **Ecosystem** (`fl_eco_`). For cross-product partners using FlashLearnAI as their backend. Two paths: the child/curriculum flow (learner-scoped sessions, mastery, cascade-delete, signed webhooks) and the standard Sets + Study API for authored decks with per-student progress via `externalStudentId`. Admin-issued.

| Tier | Price | Generations/mo | API calls/mo | Burst/min |
|------|-------|---------------|---------------|-----------|
| Free | $0 | 100 (public) / 1,000 (ecosystem) | 1,000 / 10,000 | 10 / 60 |
| Developer | $19/mo | 5,000 / 10,000 | 50,000 / 100,000 | 60 / 120 |
| Pro | $49/mo | 25,000 / 50,000 | 250,000 / 500,000 | 120 / 300 |
| Enterprise | Custom | Unlimited | Unlimited | 300 / 600 |

### White-Label App

| License | Price |
|---------|-------|
| Standard | $499 one-time (1 domain) |
| School & Enterprise | $999/year (unlimited domains, priority support) |

## Documentation

- [API Getting Started](https://flashlearnai.witus.online/docs/api/getting-started)
- [Interactive API Reference](https://flashlearnai.witus.online/docs/api). All 30 paths and 35
  operations in [`lib/api/openapi.ts`](./lib/api/openapi.ts), plus the `session.completed` webhook.
  Session-authenticated app routes, including the `/api/teacher` roster and claim routes, are not
  part of the v1 surface and are not in the spec.
- [Ecosystem API (cross-product partners)](https://flashlearnai.witus.online/docs/api/ecosystem)
- [Webhooks](https://flashlearnai.witus.online/docs/api/webhooks). Signing, retry, replay.
- [Roadmap](https://flashlearnai.witus.online/roadmap)
- [Changelog](https://flashlearnai.witus.online/changelog)
- [Help Center](https://flashlearnai.witus.online/help)

## License

Proprietary. All rights reserved.

**White-Label Starter App** ([`standalone/flashlearn-starter/`](./standalone/flashlearn-starter/)) is sold under a commercial license. See [white-label pricing](https://flashlearnai.witus.online/pricing#white-label-pricing).

---

A [WitUS.Online](https://WitUS.Online) product by B4C LLC.
