# FlashLearnAI.WitUS.Online

## Overview

FlashLearn AI is a full-featured, AI-powered flashcard platform for students, teachers, and developers. Generate flashcards from text, PDFs, YouTube videos, audio, or images using Google Gemini AI. Study with spaced repetition (SM-2), compete in versus challenges, and access everything offline.

## Key Features

- **AI-Powered Generation** — Create flashcards from text prompts, PDFs, YouTube transcripts, audio, and images using Gemini 2.5 Flash
- **Multiple Study Modes** — Classic flip, multiple choice, type-your-answer, and confidence rating
- **Spaced Repetition (SM-2)** — Scientifically-proven algorithm for optimal retention scheduling
- **Versus Mode** — Competitive async challenges with composite scoring (accuracy, speed, confidence, streak)
- **Offline-First** — Full PWA with PowerSync, IndexedDB, and service worker for offline study
- **Public API** — 23 REST endpoints for generation, sets, study, and versus (Free/Developer/Pro/Enterprise tiers)
- **White-Label Starter App** — Deployable study app powered by the Public API with custom branding
- **Admin Dashboard** — User management, analytics, content moderation, campaigns, API key management, SEO tools
- **Admin Card Quantity Selector** — Admins can choose exact card count (1-50) during AI generation
- **Progress Analytics** — Accuracy rates, streaks, charts, problem card identification
- **Achievements & Gamification** — Badges, streaks, and progress tracking
- **Sharing & Discovery** — Public set pages, shareable results, community explore page

## Technology Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** MongoDB with Mongoose ODM
- **Offline Sync:** PowerSync + IndexedDB
- **AI:** Google Gemini API (gemini-2.5-flash)
- **Auth:** NextAuth.js v4 (credentials + email code)
- **Payments:** Stripe (subscriptions + metered API billing)
- **Email:** Mailgun / Nodemailer / Resend
- **Media:** Cloudinary (image hosting)
- **Analytics:** Vercel Analytics, Chart.js
- **Deployment:** Vercel

## Getting Started

**Prerequisites:** Node.js 18+, MongoDB

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your API keys:
   - `GEMINI_API_KEY` — Google Gemini API key
   - `MONGODB_URI` — MongoDB connection string
   - `NEXTAUTH_SECRET` — NextAuth secret
   - `STRIPE_SECRET_KEY` — Stripe API key

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/              Next.js App Router pages and API routes
  (public)/       Public marketing pages (landing, pricing, explore, docs)
  (dashboard)/    Authenticated user dashboard
  (admin)/        Admin panel
  api/            API endpoints
components/       Reusable React components
hooks/            Custom React hooks
lib/              Shared utilities, services, database, logging
models/           Mongoose data models
docs/             Documentation and guides
blog/             Blog content
standalone/       White-label starter app
```

## Documentation

- [API Getting Started](api/getting-started.md)
- [Generation Guide](api/guide-generation.md)
- [Spaced Repetition Guide](api/guide-spaced-repetition.md)
- [Versus Mode Guide](api/guide-versus-mode.md)
- [Admin Dashboard Guide](guides/admin-dashboard-guide.md)
- [Coding Style Guide](guides/CODING_STYLE_GUIDE.md)
- [UI Component Guidelines](guides/ui-component-guidelines.md)
