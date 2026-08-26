import { NextResponse } from 'next/server';
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

- **AI Generation**: Create flashcards from text topics, PDFs, YouTube videos, audio, and images
- **Spaced Repetition**: SM-2 algorithm schedules reviews at the optimal time
- **Multiple Study Modes**: Classic flip cards, multiple choice, and type-your-answer
- **Versus Mode**: Challenge friends to flashcard battles with composite scoring
- **Offline Support**: Study without internet; data syncs when you reconnect
- **Teams & Classrooms**: Study groups with shared sets and leaderboards
- **Public API**: Build your own apps with our developer API

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
3. Click **Generate**: AI creates flashcards instantly
4. Review, edit, then save your set

## CSV Import

1. Prepare a CSV with \`front\` and \`back\` columns
2. Go to **Generate** → select CSV upload
3. Preview your cards and save

## Other Sources

You can also generate from:
- **PDF**: Extract text and create flashcards
- **YouTube**: Generate from video transcripts
- **Audio**: Upload audio files for transcription
- **Images**: OCR text extraction from photos`,
  },
  // ──── Study Modes ────
  {
    slug: 'your-library',
    title: 'Your Library: Keeping the Sets You Actually Study',
    category: 'getting-started',
    excerpt: 'Add public sets to your own shelf so the sets you study are the first thing you see when you sign in.',
    order: 3,
    tags: ['library', 'explore', 'dashboard'],
    content: `# Your Library

There are hundreds of public sets on FlashLearnAI, and Explore shows the newest ones first. Your
library is the fix: a short list of the sets you actually use, shown at the top of your dashboard
every time you sign in.

## Adding a set

- On **Explore**, every card has an **Add to library** button next to **Study Now**.
- On a set's own page, the same button sits under the title.
- Anything **you** create is added for you when you save it, so your own work is always there.

Once a set is on your shelf the button reads **In your library**. Click it again to remove it.

## How your library is sorted

Most recently studied first, then most recently added. Study the seven times table this morning and
it is at the top tomorrow without you doing anything. Sets you have not studied yet sit below the
ones you have, in the order you added them.

## Adding does not copy the set

Your library points at the original set. It does not make a copy. That means a correction the author
publishes reaches you, instead of leaving you studying an old version.

It also means you cannot edit a public set from your library. Sets you created are the ones you can
edit, from **My Flashcards**.

## Removing a set keeps your progress

Removing a set takes it off the shelf and nothing else. Your streak, your accuracy, and your spaced
repetition schedule for that set are all kept. Add the set back later and everything picks up where
it left off.

## There is no limit

Keep three sets or keep forty. The library is not a quota; it is just the shortcut past a large
catalogue.`,
  },
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
- **Accuracy** (40%): Correct answers / total
- **Speed** (25%): Average time per card
- **Confidence** (20%): How well your confidence matches your performance
- **Streak** (15%): Longest consecutive correct answers

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
- **Amber bar**: You're offline, progress saved locally
- **Blue bar**: Syncing items to the server
- **Green toast**: All synced, your data is up to date

## Automatic Sync
The app syncs on three triggers:
1. When you open the app (if online)
2. When your connection is restored
3. Every 5 minutes while online`,
  },
  {
    slug: 'studying-offline',
    title: 'Studying Offline',
    category: 'offline',
    excerpt: 'What works without a connection, what does not, and when your results reach your account.',
    order: 2,
    tags: ['offline', 'sync', 'study'],
    content: `# Studying Offline

You can study your own sets with no connection. Here is exactly what that covers.

## Before you go offline
Open the app online at least once while signed in. Your sets are copied to your device then, and refreshed on every app start, whenever you reconnect, and every five minutes.

## What you can do offline
- Study any set you own, in any of the three study modes
- See card images, their descriptions, and videos
- Answer written multiple-choice questions, with the answer choices the set author wrote

## What needs a connection
- Sets from Explore that you do not own. Only your own sets are copied.
- Creating or editing a set. Edits made offline are not reliably saved.
- Generating cards with AI, sharing, your dashboard, and your study history.

## Where your results go
Answers are stored on your device as you go and upload on their own once you are back online. Your spaced review schedule updates at that point, not before, so a card you missed offline is scheduled when your results arrive.

## Editing on two devices
There is no clash detection. If the same set is changed in two places, whichever change is saved last is the one kept. Edit a set in one place at a time.
`,
  },
  {
    slug: 'sharing-your-milestones',
    title: 'Sharing Your Milestones',
    category: 'account',
    excerpt: 'What the milestone sharing setting does, what it never does, and how to turn it off.',
    order: 3,
    tags: ['account', 'privacy', 'sharing'],
    content: `# Sharing Your Milestones

There is a setting on your Settings page called **Sharing your milestones**. It is off unless you turn it on.

## What it does when it is on

When you hit a milestone, like finishing a long review streak or making a set public, we write a **draft** social post about it.

## What it never does

**It never publishes anything.** A draft goes into a review queue and a person reads it before it goes anywhere. Nothing is posted automatically, and nothing is posted without that review.

It also never shares your answers, your scores, or anything about what you got wrong.

## Turning it off

Settings, then switch **Sharing your milestones** off. It takes effect straight away. Drafts already written stay in the review queue; if you want one pulled, contact support.

## If you never turn it on

Nothing happens. No drafts are written and no milestone leaves your account.
`,
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
  {
    slug: 'managed-student-accounts',
    title: 'Adding Students Who Have No Email Address',
    category: 'teams',
    excerpt: 'Add a student to your classroom by name, hand them a claim code, and let them take the account over later with their own email and password.',
    order: 2,
    tags: ['classrooms', 'teachers', 'students', 'claim-code'],
    content: `# Adding Students Who Have No Email Address

Some students do not have an email address, a device of their own, or a signup they can remember. You
can still put them on your roster. Add them by name and FlashLearnAI creates the account for you.

## Adding a student

1. Open your classroom from **Classrooms**.
2. On the roster, choose **Add student**.
3. Type the student's name, between 2 and 80 characters. That is the only thing you enter.
4. Save. The student appears on the roster straight away, marked as managed.

You add students one at a time. There is no list paste and no file import.

## The claim code, and why you see it once

Every managed student is created with a **claim code**: ten characters in two groups, like
ABCDE-FGHJK. It is the student's only route to taking the account over later, so write it down or
hand it to them before you close the dialog. The dialog will not let you past it until you confirm
with **I have written the code down**.

Nothing stores the code in readable form, so nobody, support included, can look it up for you
afterwards. If you lose it, open the student on the roster and mint a **new claim code**. The old one
stops working the moment the new one appears.

A claim code lasts 90 days. After that the roster shows it as expired and you mint a fresh one the
same way.

## What to tell the student

Say this, in this order:

1. "This account is yours. Everything you do in class is recorded on it."
2. "Here is your claim code. Keep it somewhere you will find it."
3. "When you have an email address, go to flashlearnai.witus.online/claim, enter the code, your
   email, and a password."
4. "Everything you have already studied comes with you. Nothing resets."

That last line is worth saying out loud, because it is the point of the whole thing. Claiming keeps
every session, every card result, and the entire spaced repetition schedule, because it is the same
account rather than a new one.

Claiming asks the student to confirm they are 13 or older. Afterwards they verify the email address
they entered, and then they can sign in with their password.

## Studying with a managed student

On the roster, choose **Start session** next to the student. The study screen opens with a banner
saying the session will be saved to them, and you pick the set from there. If you started from a set
instead, the **Who is studying?** picker on the last step does the same job.

Studying for a student needs a connection. Offline results are saved against whoever is signed in, so
the app refuses to mis-attribute them and studies as you instead.

## The limitation, stated plainly

A managed student **cannot sign in, and cannot study at home**. There is no password to give them and
no way for you to set one. In class they study on your device, with you running the session, and the
results record to their account. That is all a managed account does until it is claimed.

If a student already has an email address, have them sign up and join the classroom with the join
code instead. That gets them everything at once.

## Why you cannot set a student's password

This is deliberate. A teacher who can set a password can sign in as the student, and then nothing in
the record can tell which of the two answered a card. The claim flow is the only path from your
account to theirs, and it runs through the student.

## Removing a student

Removing a student takes them off the roster. It does not delete the account and it does not touch
their study history. Removals are usually corrections: wrong class, duplicate name, a student who
moved sections. Erasing weeks of a student's work would be the wrong answer to a typo.

Once a student is off your roster you can no longer record sessions for them or mint them a claim
code. Both of those come from the student being in your classroom.`,
  },
  {
    slug: 'reading-a-student-progress',
    title: 'Reading a Student\'s Progress',
    category: 'teams',
    excerpt: 'Open one student\'s record from the roster, read what each number means, and know why "no study sessions yet" is not the same as 0%.',
    order: 3,
    tags: ['classrooms', 'teachers', 'tutors', 'parents', 'progress'],
    content: `# Reading a Student's Progress

You can open one student's whole record: what they get right, what they keep missing, when they last
studied, and how long for. It is written to be read in the minute before a lesson, so the summary is
at the top and the part you act on, the list of cards to go over, is right underneath it.

## Opening it

1. Open your classroom from **Classrooms**.
2. Find the student on the roster.
3. Choose **Progress** next to their name.

The page is headed with the student's name. **Back to the roster** returns you to where you started.

## Who is allowed to see this

The adults who may run a study session for a student are exactly the adults who may read that
student's progress. There are two ways to be one of them:

- You teach an active classroom the student is enrolled in. An archived classroom does not count.
- The student is linked to your account. This is how a tutor, a parent, or a guardian reaches a
  learner who is not in a classroom you teach.

Nobody else can open the page, whatever role they hold. Holding the Teacher role does not let you
read a student on somebody else's roster. Asking for a student you are not connected to answers
**You can only see progress for a student you teach or are linked to.**

If you are a parent or a guardian, the progress page is the only page in the teaching area open to
you. There is no wider family area yet, no single list of every child you look after, and the link
between your account and a student is not something you can create yourself: it has to be set on your
account for you. Creating classrooms and assignments stays with the teaching roles.

No email address appears anywhere on the page. A class account you created holds a placeholder
address that cannot receive mail, and it is left out of the report rather than shown to whoever opens
it.

## "No study sessions yet" is not a zero

A student who has never finished a study session gets a short block headed **No study sessions yet**
in place of the whole report. It says there is no accuracy, no card record, and no time to report.

Read that as an absence, not a bad result. 0% would mean the student answered questions and got all
of them wrong. This means nothing has been recorded, which tells you nothing about the student at
all. Anywhere else on the page, a figure with nothing behind it says so in words rather than showing
a zero: **No answers yet**, **Not recorded**, **None yet**, **Not scored yet**.

A session has to be finished to count. One that was abandoned halfway does not appear.

The empty block offers **Start a session**, which is usually the right next move.

## The short version

The block at the top of the page:

- **Accuracy, all time.** Cards answered right, out of cards attempted, across every session.
- **Accuracy, last 30 days.** The same sum over the last 30 days only. Read it next to the all-time
  figure: a recent number well above it is a student who is pulling ahead of their own record, and
  one well below it is worth asking about.
- **Cards right** and **Cards wrong.** Totals over every session. These two are the numbers the
  accuracy above is calculated from, on purpose, so the figures multiply out instead of being three
  different measurements you have to reconcile.
- **Sessions finished.** How many study sessions the student has completed.
- **Time studied.** Total time in session, however it was spent.

Underneath, a line covering the last 30 days, and **Average session score**. That last one is the
figure on the student's own dashboard, averaged across sets, so it can sit a little apart from the
card accuracy above it. Both are right. They are answering different questions.

## Cards to go over

Every card the student has answered wrong at least once, worst accuracy first, up to twenty of them.
**Hardest mode** names the study mode and direction the card goes worst in, which is often the real
story: a student who knows a fact front to back and not back to front does not have a gap in the
fact.

A card lands on this list after **one** miss. The review scheduler waits for more than that before it
changes how often a card comes back, and it is right to, because one miss can be a slip. This list
does not wait, because you are deciding what to ask about in the next ten minutes rather than
rescheduling anything.

If a card has been edited or deleted since the student answered it, the row reads **This card has
since been edited or removed** and the counts are still accurate.

## By set

Each set the student has a record in, weakest set first, with accuracy, right, wrong, sessions, time,
and **Cards seen**. Cards seen is how many cards in that set the student has any record for, so it
tells you how much of the set they have actually met.

## Recent sessions

The last ten finished sessions, newest first, with the date and time, the set, right and wrong
counts, accuracy, how long it took, and **Studied**, which reads **With an adult** or **On their
own**. That last column matters when a score looks unexpectedly high or low: a session you ran
together is a different kind of evidence than one the student did alone.

## Where the numbers come from

The same records the student's own progress page reads. You and the student are never looking at two
different figures for the same thing, which means you can talk about a number on this page with them
directly.

A session an adult ran counts toward the student, never toward the adult. If you have run sessions
for a student, that work is on their page and not on yours.`,
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
export async function POST() {
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
