# FlashLearnAI.WitUS.Online

AI-powered flashcard platform with spaced repetition, versus mode, and offline-first architecture.

**Live:** [flashlearnai.witus.online](https://flashlearnai.witus.online)

## Features

- **AI Generation** — Create flashcards from topics, PDFs, YouTube videos, audio files, and images (OCR)
- **Spaced Repetition** — SM-2 algorithm schedules reviews at optimal intervals
- **3 Study Modes** — Classic flip cards, multiple choice, type-your-answer with AI grading
- **Versus Mode** — Head-to-head challenges with composite scoring (accuracy, speed, confidence, streaks) and ELO ratings
- **Offline-First** — PowerSync + IndexedDB with automatic sync and conflict resolution
- **Teams & Classrooms** — Study groups with join codes, shared sets, team chat, and teacher-led classrooms
- **Public API** — 27 REST endpoints for building on top of FlashLearnAI
- **Ecosystem API for Cross-Product Partners** — Drop-in spaced-repetition + comprehension backend for any consumer-facing learning product. Child-scoped scheduled sessions, per-standard mastery rollups, COPPA cascade-delete, and signed outbound webhooks. Powers Wanderlearn Stories.
- **Signed Outbound Webhooks** — HMAC-SHA256 signed callbacks with 7-attempt exponential backoff, dead-letter, AES-256-GCM secret encryption at rest, and a self-service developer dashboard with replay
- **White-Label App** — Branded study platform for schools and companies (sold separately)
- **Marketing & Link Tracking** — Switchy.io short links with pixel attribution on all shared content
- **Admin Dashboard** — Revenue analytics, user management, content moderation, promo campaigns, SEO tools

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Database:** MongoDB Atlas, Mongoose
- **Auth:** NextAuth.js with JWT sessions
- **Payments:** Stripe (subscriptions + metered billing)
- **Email:** Mailgun, Resend
- **AI:** Google Gemini
- **Offline:** PowerSync (SQLite via wa-sqlite), IndexedDB
- **Rate Limiting:** Upstash Redis
- **Background Jobs:** Upstash QStash (delayed delivery + webhook retries)
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
cp .env.example .env.local  # Configure your environment variables
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
GEMINI_API_KEY_PUBLIC=                # Google Gemini API key
UPSTASH_REDIS_REST_URL=               # Rate limiting + webhook milestone dedupe
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=                    # Stripe secret key
MAILGUN_API_KEY=                      # Mailgun API key
MAILGUN_DOMAIN=                       # Your Mailgun domain
SWITCHY_API_TOKEN=                    # Switchy.io API token
SWITCHY_DOMAIN=                       # Custom short link domain
CRON_SECRET=                          # openssl rand -hex 32 (for Vercel Cron)
```

Required for ecosystem outbound webhooks + delayed session scheduling:

```env
WEBHOOK_ENCRYPTION_KEY=               # openssl rand -hex 32 (AES-256-GCM key for per-endpoint signing secrets)
UPSTASH_QSTASH_TOKEN=                 # Upstash QStash publishing token
UPSTASH_QSTASH_CURRENT_SIGNING_KEY=   # For verifying QStash callbacks
UPSTASH_QSTASH_NEXT_SIGNING_KEY=      # For zero-downtime signing-key rotation
```

## Pricing

| Plan | Price |
|------|-------|
| Free | $0 (limited AI generations) |
| Monthly Pro | $10.60/month |
| Lifetime Learner | $103.29 one-time (first 100 users) |

### API Tiers

Two key types share the tier table — choose based on your use case:

- **Public** (`fl_pub_`) — for apps building on top of FlashLearnAI (study apps, LMS integrations).
- **Ecosystem** (`fl_eco_`) — for cross-product partners using FlashLearnAI as their backend (child-scoped sessions, mastery, COPPA delete, signed webhooks). Admin-issued.

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
- [Interactive API Reference](https://flashlearnai.witus.online/docs/api) — all 27 endpoints
- [Ecosystem API (cross-product partners)](https://flashlearnai.witus.online/docs/api/ecosystem)
- [Webhooks](https://flashlearnai.witus.online/docs/api/webhooks) — signing, retry, replay
- [Roadmap](https://flashlearnai.witus.online/roadmap)
- [Changelog](https://flashlearnai.witus.online/changelog)
- [Help Center](https://flashlearnai.witus.online/help)

## License

Proprietary. All rights reserved.

**White-Label Starter App** is sold under a commercial license. See [pricing](https://flashlearnai.witus.online/pricing).

---

A [WitUS.Online](https://WitUS.Online) product by B4C LLC.
