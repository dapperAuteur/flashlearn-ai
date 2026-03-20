# Introducing the FlashLearn AI Public API: AI-Powered Flashcard Generation for Developers

**TL;DR:** FlashLearn AI now has a public API. Generate flashcards from any topic with one API call. Free tier included. No other flashcard platform offers this.

---

## The Problem

Every learning platform, LMS, and edtech app needs study content. Building flashcard generation from scratch means integrating AI models, validating output, managing spaced repetition data, and handling storage. That's weeks of work before you ship a single card.

Meanwhile, students spend hours manually creating flashcards instead of studying. Teachers build the same review materials semester after semester. Developers building learning tools reinvent the same wheel.

## The Solution

The FlashLearn AI API lets you generate, manage, and retrieve AI-powered flashcards with a single HTTP request. We handle the AI, validation, storage, and spaced repetition initialization. You get structured JSON back in seconds.

```bash
curl -X POST https://flashlearn.ai/api/v1/generate \
  -H "Authorization: Bearer fl_pub_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Photosynthesis in plants"}'
```

Response:
```json
{
  "data": {
    "flashcards": [
      {
        "front": "What is the primary pigment responsible for photosynthesis?",
        "back": "Chlorophyll, specifically chlorophyll a, absorbs light energy to drive photosynthesis."
      },
      {
        "front": "What are the two main stages of photosynthesis?",
        "back": "The light-dependent reactions (in thylakoid membranes) and the Calvin cycle (in the stroma)."
      }
    ],
    "setId": "665f1a2b3c4d5e6f7a8b9c0d",
    "source": "generated",
    "cardCount": 10
  },
  "meta": {
    "requestId": "req_a1b2c3d4e5f6",
    "rateLimit": {
      "limit": 60,
      "remaining": 59,
      "reset": 1711843200
    }
  }
}
```

That's it. Ten peer-reviewed flashcards, ready to display, store, or feed into your own spaced repetition system.

---

## Who Is This For?

### Developers Building Learning Tools

If you're building a study app, tutoring platform, or any product where users need to learn content, the FlashLearn API saves you months of development. Instead of wiring up AI prompts, parsing unreliable outputs, and building flashcard storage, you call one endpoint.

```javascript
// Node.js / Next.js example
const response = await fetch('https://flashlearn.ai/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.FLASHLEARN_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'JavaScript Promises and async/await',
    title: 'JS Async Patterns',
  }),
});

const { data } = await response.json();
// data.flashcards = [{ front: "...", back: "..." }, ...]
// data.setId = "..." (persistent, retrievable later)
```

### Schools and Universities

Integrate flashcard generation directly into your LMS. Teachers generate review materials for any lesson in seconds. Students get AI-powered study sets without leaving the school platform.

```python
# Python example for a school LMS integration
import requests

def generate_study_set(topic, api_key):
    response = requests.post(
        'https://flashlearn.ai/api/v1/generate',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'topic': topic,
            'title': f'Review: {topic}',
        },
    )
    return response.json()['data']

# Generate study materials for an entire unit
chapters = [
    'Cell Biology: Structure and Function',
    'DNA Replication and Transcription',
    'Mendelian Genetics',
    'Evolution and Natural Selection',
]

for chapter in chapters:
    cards = generate_study_set(chapter, 'fl_pub_your_key')
    print(f"Generated {cards['cardCount']} cards for: {chapter}")
```

### Students Building Study Tools

Building a side project? The free tier gives you 100 generations per month at no cost. Create a Chrome extension that generates flashcards from any webpage, a Slack bot that quizzes your study group, or a mobile app that turns lecture notes into study sets.

### EdTech Companies

White-label flashcard generation in your product. Your users get AI-generated study content. You get engagement and retention. We handle the AI infrastructure and scaling.

**Batch generation** lets Pro and Enterprise tiers generate up to 10 topics in a single request:

```bash
curl -X POST https://flashlearn.ai/api/v1/generate/batch \
  -H "Authorization: Bearer fl_pub_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "topics": [
      {"topic": "World War 1: Causes"},
      {"topic": "World War 1: Major Battles"},
      {"topic": "World War 1: Treaty of Versailles"}
    ]
  }'
```

---

## Spaced Repetition via API

FlashLearn uses the SM-2 algorithm (the same one behind Anki) to schedule reviews at optimal intervals. The API gives you full access to this system:

```javascript
// 1. Check what's due for review
const dueRes = await fetch('https://flashlearn.ai/api/v1/study/due-cards', {
  headers: { 'Authorization': `Bearer ${API_KEY}` },
});
const { data } = await dueRes.json();
// data.sets = [{ setId, setName, dueCount, dueCardIds }]
// data.totalDue = 15

// 2. Start a study session
const sessionRes = await fetch('https://flashlearn.ai/api/v1/study/sessions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ setId: 'abc123', studyMode: 'type-answer' }),
});
// Returns shuffled flashcards + sessionId

// 3. Submit results when done
const completeRes = await fetch(`https://flashlearn.ai/api/v1/study/sessions/${sessionId}/complete`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    results: [
      { cardId: 'card1', isCorrect: true, timeSeconds: 4.2, confidenceRating: 5 },
      { cardId: 'card2', isCorrect: false, timeSeconds: 8.1, confidenceRating: 2 },
    ]
  }),
});
// Returns: accuracy, correctCount, durationSeconds
// SM-2 automatically reschedules each card based on performance
```

You can also get detailed analytics per card — easiness factor, interval, repetitions, and next review date:

```bash
curl https://flashlearn.ai/api/v1/study/analytics/SET_ID \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

---

## Versus Mode: Competitive Learning via API

Build quiz competitions, classroom challenges, or tournament brackets. The Versus API handles scoring, ranking, and leaderboards.

```javascript
// 1. Create a challenge
const challenge = await fetch('https://flashlearn.ai/api/v1/versus/challenges', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flashcardSetId: 'abc123',
    scope: 'public',       // 'direct' (1v1), 'classroom', or 'public'
    studyMode: 'classic',
  }),
});
// Returns: challengeCode (e.g., "X7K2M9"), challengeId

// 2. Others join with the code
await fetch('https://flashlearn.ai/api/v1/versus/join', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${THEIR_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ challengeCode: 'X7K2M9' }),
});

// 3. Play and complete — get a composite score (0-1000)
// Score = 40% accuracy + 25% speed + 20% confidence calibration + 15% streak
```

The composite scoring rewards not just correctness, but speed, confidence calibration (knowing when you know), and consistency (longest correct streak).

---

## Full Feature List

### Generation
- **AI Flashcard Generation** — Generate 5-20 flashcards from any topic using Gemini 2.5 Flash
- **Batch Generation** — Generate multiple topics in one request (Pro/Enterprise)
- **Smart Deduplication** — Returns existing high-quality public sets when available (saves you money)
- **Spaced Repetition Ready** — Every card is initialized with SM-2 algorithm data

### Study & Spaced Repetition
- **Due Cards** — Get cards ready for review based on SM-2 scheduling
- **Review Schedule** — Forecast upcoming reviews (today, tomorrow, 14-day breakdown)
- **Study Sessions** — Start sessions with shuffled cards, submit results, track progress
- **AI Answer Evaluation** — Check typed answers against correct answers with AI (typos, synonyms)
- **SM-2 Analytics** — Per-card easiness factor, interval, repetitions, next review date
- **Multi-Mode Support** — Classic, multiple choice, and type-answer study modes

### Versus Mode
- **Create Challenges** — Generate shareable 6-character challenge codes
- **Join by Code** — Players join challenges with a single API call
- **Composite Scoring** — 0-1000 score from accuracy (40%), speed (25%), confidence (20%), streak (15%)
- **Leaderboards** — Per-challenge rankings with full score breakdowns
- **Open Challenges** — Browse and join public challenges
- **ELO Rating** — Player ratings that adjust with wins and losses
- **Win Streaks** — Track current and best win streaks

### Set Management
- **Full CRUD** — Create, read, update, and delete flashcard sets via API
- **Explore Public Sets** — Browse and search the community's public flashcard library
- **Categories** — Filter and organize content by subject categories

### Usage & Billing
- **Real-Time Usage Tracking** — Check your quota and limits anytime via `/api/v1/usage`
- **Rate Limit Headers** — Every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Transparent Billing** — Stripe-powered subscriptions with a developer portal dashboard

### Security & Enterprise
- **API Key Types** — Separate keys for different purposes (public, admin, app, admin-public)
- **IP Allowlisting** — Restrict API key usage to specific IP addresses or CIDR ranges
- **Key Rotation** — Rotate keys without downtime (old key revoked, new key created atomically)
- **Webhook Notifications** — Get notified when usage milestones are reached
- **Priority Support** — Enterprise customers get priority routing

### Developer Experience
- **OpenAPI 3.1 Spec** — Full specification at `/api/v1/openapi`
- **Interactive Docs** — Try endpoints directly at `/docs/api`
- **Developer Portal** — Manage keys, view usage analytics, and control billing at `/developer`
- **Standard JSON Envelope** — Consistent `{ data, meta }` response format across all endpoints
- **CORS Enabled** — Call the API from any domain

---

## Pricing

| Tier | Price | Generations/mo | API Calls/mo |
|------|-------|---------------|-------------|
| **Free** | $0 | 100 | 1,000 |
| **Developer** | $19/mo | 5,000 | 50,000 |
| **Pro** | $49/mo | 25,000 | 250,000 |
| **Enterprise** | Custom | Unlimited | Unlimited |

The Free tier is genuinely useful — 100 generations is enough to build a prototype, validate your idea, or run a classroom pilot. No credit card required.

---

## Get Started in 60 Seconds

1. **Sign up** at [flashlearn.ai](https://flashlearn.ai)
2. Go to the **Developer Portal** at `/developer`
3. Click **New Key** to create a Public API key
4. Copy your key (shown once) and make your first request:

```bash
curl -X POST https://flashlearn.ai/api/v1/generate \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Introduction to Machine Learning"}'
```

5. Browse the **interactive docs** at `/docs/api`

---

## What Makes This Different

**No other flashcard platform has a public API.** Quizlet shut theirs down. Anki is local-only. Brainscape and StudySmarter are closed ecosystems. FlashLearn is the first and only platform offering AI-powered flashcard generation as an API.

We're building this in the open because we believe study tools should be composable. Your app shouldn't have to build flashcard generation from scratch. Use ours, focus on what makes your product unique, and let your users study smarter.

---

**Ready to try it?** [Create a free account](https://flashlearn.ai/auth/signup) and generate your first flashcards via API today.

Questions? Reach out at support@flashlearn.ai or open an issue on our GitHub.
