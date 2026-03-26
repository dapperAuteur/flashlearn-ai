import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle } from '@/models/HelpArticle';

const seedArticles = [
  // ──── Getting Started ────
  {
    slug: 'what-is-flashlearnai',
    title: 'What Is FlashLearnAI?',
    category: 'getting-started',
    excerpt: 'FlashLearnAI is an AI-powered flashcard platform for smarter studying with spaced repetition, versus mode, and offline support.',
    order: 1,
    tags: ['overview', 'introduction'],
    content: `# What Is FlashLearnAI?

FlashLearnAI is an AI-powered flashcard platform that helps you study smarter. Generate flashcards from any topic using AI, organize them into sets, and study with spaced repetition scheduling.

## Key Features

- **AI Generation** — Create flashcards from text topics, PDFs, YouTube videos, audio, and images
- **Spaced Repetition** — SM-2 algorithm schedules reviews at the optimal time
- **Multiple Study Modes** — Classic flip cards, multiple choice, and type-your-answer
- **Versus Mode** — Challenge friends to flashcard battles with composite scoring
- **Offline Support** — Study without internet; data syncs when you reconnect
- **Teams & Classrooms** — Study groups with shared sets and leaderboards
- **Public API** — Build your own apps with our developer API

## Getting Started

1. Sign up at [flashlearnai.witus.online/auth/signup](/auth/signup)
2. Generate your first flashcard set from the dashboard
3. Start studying with spaced repetition`,
  },
  {
    slug: 'creating-your-first-set',
    title: 'Creating Your First Flashcard Set',
    category: 'getting-started',
    excerpt: 'Learn how to create flashcard sets using AI generation, CSV import, or manual entry.',
    order: 2,
    tags: ['sets', 'ai', 'generation'],
    content: `# Creating Your First Flashcard Set

## AI Generation (Fastest)

1. Go to **Generate** from the dashboard
2. Enter a topic (e.g., "Introduction to Machine Learning")
3. Click **Generate** — AI creates flashcards instantly
4. Review, edit, then save your set

## CSV Import

1. Prepare a CSV with \`front\` and \`back\` columns
2. Go to **Generate** → select CSV upload
3. Preview your cards and save

## Other Sources

You can also generate from:
- **PDF** — Extract text and create flashcards
- **YouTube** — Generate from video transcripts
- **Audio** — Upload audio files for transcription
- **Images** — OCR text extraction from photos`,
  },
  // ──── Study Modes ────
  {
    slug: 'study-modes-explained',
    title: 'Study Modes Explained',
    category: 'study-modes',
    excerpt: 'Understand the three study modes: Classic (Easy), Multiple Choice (Medium), and Type Your Answer (Hard).',
    order: 1,
    tags: ['study', 'modes', 'spaced-repetition'],
    content: `# Study Modes Explained

FlashLearnAI offers three study modes with increasing difficulty:

## Classic Mode (Easy)
Flip cards and self-report whether you got it right. Best for initial learning and quick review.

## Multiple Choice Mode (Medium)
Select the correct answer from four options. The wrong answers are pulled from other cards in the same set.

## Type Your Answer Mode (Hard)
Type your answer freely. AI evaluates your response, handling typos and synonyms intelligently.

## Confidence Rating
Before each card, rate your confidence (1-5). This helps calibrate your spaced repetition schedule and contributes to your Versus composite score.

## Spaced Repetition
All modes use the SM-2 algorithm to schedule reviews. Cards you struggle with appear more frequently; cards you know well are spaced out further.`,
  },
  // ──── Versus ────
  {
    slug: 'versus-mode-guide',
    title: 'How Versus Mode Works',
    category: 'versus',
    excerpt: 'Challenge friends to flashcard battles with composite scoring across accuracy, speed, confidence, and streaks.',
    order: 1,
    tags: ['versus', 'challenges', 'competitive'],
    content: `# How Versus Mode Works

Versus mode lets you challenge others to flashcard battles. Everyone studies the same cards, and scores are compared.

## Creating a Challenge
1. Go to **Versus** → **Create Challenge**
2. Select a flashcard set and study mode
3. Choose scope: Direct (1v1), Classroom, or Public
4. Share the 6-character challenge code with opponents

## Composite Scoring (0-1000)
Your score is calculated from four factors:
- **Accuracy** (40%) — Correct answers / total
- **Speed** (25%) — Average time per card
- **Confidence** (20%) — How well your confidence matches your performance
- **Streak** (15%) — Longest consecutive correct answers

## Leaderboards
Global and classroom leaderboards track lifetime performance. Players also have ELO-style ratings that adjust after each challenge.`,
  },
  // ──── Offline ────
  {
    slug: 'offline-mode',
    title: 'Studying Offline',
    category: 'offline',
    excerpt: 'FlashLearnAI works without internet. Your progress syncs automatically when you reconnect.',
    order: 1,
    tags: ['offline', 'sync', 'pwa'],
    content: `# Studying Offline

FlashLearnAI is built offline-first. Your flashcards and study data are stored locally so you can study anywhere.

## How It Works
- Flashcard sets are cached in a local database (PowerSync + SQLite)
- Study results are saved to IndexedDB immediately
- When you go back online, everything syncs automatically

## What Works Offline
- Viewing and studying your flashcard sets
- Recording study session results
- Creating and editing flashcard sets

## Sync Indicators
- **Amber bar** — You're offline, progress saved locally
- **Blue bar** — Syncing items to the server
- **Green toast** — All synced, your data is up to date

## Automatic Sync
The app syncs on three triggers:
1. When you open the app (if online)
2. When your connection is restored
3. Every 5 minutes while online`,
  },
  {
    slug: 'resolving-sync-conflicts',
    title: 'Resolving Sync Conflicts',
    category: 'offline',
    excerpt: 'When the same content is edited on multiple devices while offline, a conflict is detected. Learn how to resolve it.',
    order: 2,
    tags: ['offline', 'sync', 'conflicts'],
    content: `# Resolving Sync Conflicts

A sync conflict happens when you edit a flashcard set offline on one device while it was also edited elsewhere (another device or another user with access).

## How Conflicts Are Detected
When you go back online and the app tries to push your changes, the server detects that the content has changed since your last sync. Instead of silently overwriting, the app queues the conflict for your review.

## The Conflict Banner
When a conflict is detected, you'll see:
- A **red banner** at the bottom of the screen with the number of conflicts
- A **toast notification** alerting you
- A **"Review" link** that takes you to the conflict resolution page

## Resolving a Conflict
Navigate to **Dashboard → Conflicts** (or tap the Review link). For each conflict:

1. **Side-by-side view** shows your local version and the server version
2. Fields that differ are highlighted in blue (local) and green (server)
3. Choose one:
   - **Keep Local** — Push your offline changes to the server
   - **Keep Server** — Discard your local changes and use the server version

## Preventing Conflicts
- Sync regularly when online (the app does this automatically every 5 minutes)
- Avoid editing the same set on multiple devices while offline`,
  },
  // ──── API ────
  {
    slug: 'short-link-sharing',
    title: 'Short Link Sharing & Tracking',
    category: 'api',
    excerpt: 'Every shared link is tracked with Switchy.io short URLs and marketing pixels for attribution.',
    order: 1,
    tags: ['sharing', 'links', 'tracking', 'marketing'],
    content: `# Short Link Sharing & Tracking

When you share versus challenges, flashcard sets, or study results, FlashLearnAI automatically creates tracked short links.

## How It Works
- Short links are generated via Switchy.io when content is shared
- Marketing pixels (Facebook, Google Analytics, TikTok, etc.) are attached automatically
- UTM parameters track which platform the share came from

## Share Modals
When you click "Share" on a challenge, set, or study result:
- The **short URL** is displayed (cleaner for social posts)
- Copy to clipboard, share on Twitter/X, Facebook, or email
- If no short link exists, the full URL is used as a fallback

## For Admins
The **/admin/links** dashboard shows:
- All tracked short links with type, content, and URL
- Count of shareable content missing short links
- One-click backfill to generate links for existing content`,
  },
  // ──── Teams ────
  {
    slug: 'teams-and-classrooms',
    title: 'Teams & Classrooms',
    category: 'teams',
    excerpt: 'Create study teams with join codes, shared sets, team chat, and leaderboards. Teachers can create classrooms.',
    order: 1,
    tags: ['teams', 'classrooms', 'collaboration'],
    content: `# Teams & Classrooms

## Study Teams
Create a team to study together:
1. Go to **Teams** → **Create Team**
2. Share the join code with your group
3. Team members can share sets, chat, and compete on team leaderboards

## Teacher Classrooms
Teachers have additional features:
- Create classrooms and enroll students
- Assign flashcard sets as study material
- Track student progress and analytics
- Run classroom-wide versus challenges

## Shared Set Libraries
Teams and classrooms have shared set libraries where members can contribute flashcard sets for everyone to study.`,
  },
  // ──── Account ────
  {
    slug: 'managing-your-account',
    title: 'Managing Your Account',
    category: 'account',
    excerpt: 'Update your profile, change your password, manage privacy settings, and customize your username.',
    order: 1,
    tags: ['account', 'profile', 'settings'],
    content: `# Managing Your Account

## Profile
- Set a custom username (displayed on leaderboards)
- Upload a profile picture
- Write a bio and add study interests
- Control privacy: public or followers-only activity feed

## Settings
- Change your email or password
- Manage notification preferences
- View your subscription status
- Export your data

## Public Profile
Your profile is visible at **/u/your-username**. It shows your achievements, study stats, and public activity feed.`,
  },
  // ──── Billing ────
  {
    slug: 'subscription-plans',
    title: 'Subscription Plans',
    category: 'billing',
    excerpt: 'FlashLearnAI offers Free, Pro ($10/month), and Lifetime ($100 one-time) subscription tiers.',
    order: 1,
    tags: ['billing', 'subscription', 'pricing'],
    content: `# Subscription Plans

## Free Tier
- Create unlimited flashcard sets
- Study with all three modes
- Spaced repetition scheduling
- Versus mode challenges

## Pro ($10/month)
Everything in Free, plus:
- Extended challenge expiry (72 hours vs 24)
- Priority support
- Higher API rate limits

## Lifetime Learner ($100 one-time)
Everything in Pro, forever. One payment, no recurring charges.

## Managing Your Subscription
Go to **Settings** → **Subscription** to:
- Upgrade or downgrade your plan
- Apply promo codes
- Access the Stripe billing portal
- Cancel your subscription`,
  },
];

// POST - Seed help articles (admin only, idempotent)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    let created = 0;
    let skipped = 0;

    for (const article of seedArticles) {
      const existing = await HelpArticle.findOne({ slug: article.slug }).lean();
      if (existing) {
        skipped++;
        continue;
      }
      await HelpArticle.create({ ...article, isPublished: true });
      created++;
    }

    return NextResponse.json({
      message: `Seeded ${created} articles, skipped ${skipped} existing`,
      created,
      skipped,
      total: seedArticles.length,
    });
  } catch (error) {
    console.error('Error seeding help articles:', error);
    return NextResponse.json({ error: 'Failed to seed articles' }, { status: 500 });
  }
}
