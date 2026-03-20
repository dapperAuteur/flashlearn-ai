# Build a Spaced Repetition Study App in 30 Minutes with the FlashLearn API

You don't need to implement SM-2 from scratch. The FlashLearn API handles the algorithm, scheduling, and storage. You just build the UI.

This tutorial walks through building a functional study app that generates AI flashcards, tracks spaced repetition progress, and shows analytics — all with 5 API calls.

---

## What We're Building

A simple study flow:
1. Generate flashcards on a topic
2. Show cards due for review
3. Run a study session with self-grading
4. Submit results (SM-2 automatically reschedules)
5. Show per-card analytics

## Prerequisites

- A FlashLearn API key (free at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer))
- Node.js or any language that can make HTTP requests

---

## Step 1: Generate Flashcards

```javascript
const API_KEY = 'fl_pub_your_key';
const BASE = 'https://flashlearnai.witus.online/api/v1';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `API error: ${res.status}`);
  return json.data;
}

// Generate cards
const result = await api('POST', '/generate', {
  topic: 'JavaScript Array Methods',
  title: 'JS Arrays Study Set',
});

console.log(`Created set ${result.setId} with ${result.cardCount} cards`);
// result.flashcards = [{ front: "What does .map() return?", back: "A new array..." }, ...]
```

That's 10-20 flashcards on JS array methods, stored permanently in your account.

## Step 2: Check What's Due

```javascript
const due = await api('GET', '/study/due-cards');
console.log(`You have ${due.totalDue} cards to review`);

for (const set of due.sets) {
  console.log(`  ${set.setName}: ${set.dueCount} cards due`);
}
```

First time? Everything is due (interval = 0). After studying, SM-2 schedules each card for the future.

## Step 3: Start a Session

```javascript
const session = await api('POST', '/study/sessions', {
  setId: result.setId,
  studyMode: 'classic',        // or 'type-answer' for AI grading
  studyDirection: 'front-to-back',
});

console.log(`Session ${session.sessionId}: ${session.totalCards} cards`);
// session.flashcards = shuffled array of { id, front, back }
```

## Step 4: Study and Collect Results

In your UI, show cards one at a time. For each card, record:
- `isCorrect` — Did the user know the answer?
- `timeSeconds` — How long they took
- `confidenceRating` (1-5) — How confident were they?

```javascript
const results = [];
const startTime = Date.now();

for (const card of session.flashcards) {
  // ... show card.front, then card.back in your UI ...

  const timeSeconds = (Date.now() - startTime) / 1000;
  results.push({
    cardId: card.id,
    isCorrect: true,        // from user's self-grade
    timeSeconds,
    confidenceRating: 4,    // from user's confidence selection
  });
}
```

## Step 5: Submit Results

```javascript
const completed = await api('POST', `/study/sessions/${session.sessionId}/complete`, {
  results,
});

console.log(`Accuracy: ${completed.accuracy}%`);
console.log(`Duration: ${completed.durationSeconds}s`);
console.log(`Correct: ${completed.correctCount} / ${completed.completedCards}`);
```

SM-2 now recalculates each card's next review date. Cards you got right won't appear for days. Cards you missed will show up tomorrow.

## Step 6: Check Analytics

```javascript
const analytics = await api('GET', `/study/analytics/${result.setId}`);

for (const card of analytics.analytics.cards) {
  console.log(`Card ${card.cardId}:`);
  console.log(`  Correct: ${card.correctCount}, Incorrect: ${card.incorrectCount}`);
  console.log(`  Next review: ${card.sm2.nextReviewDate}`);
  console.log(`  Easiness: ${card.sm2.easinessFactor} (${card.sm2.easinessFactor < 2.0 ? 'struggling' : 'comfortable'})`);
  console.log(`  Interval: ${card.sm2.interval} days`);
}
```

Cards with low easiness factors (< 2.0) are the ones your user finds difficult. Cards with long intervals (> 30 days) are well-memorized.

---

## The Full Flow in One Script

```javascript
// 1. Generate
const set = await api('POST', '/generate', { topic: 'React Hooks' });

// 2. Start session
const session = await api('POST', '/study/sessions', { setId: set.setId });

// 3. Simulate studying (in real app, this is interactive)
const results = session.flashcards.map((card, i) => ({
  cardId: card.id,
  isCorrect: i % 3 !== 0,      // get every 3rd card wrong
  timeSeconds: 3 + Math.random() * 10,
  confidenceRating: i % 3 !== 0 ? 4 : 2,
}));

// 4. Complete
const done = await api('POST', `/study/sessions/${session.sessionId}/complete`, { results });
console.log(`Done! ${done.accuracy}% accuracy in ${done.durationSeconds}s`);

// 5. Check what's due tomorrow
const schedule = await api('GET', '/study/due-cards/schedule');
console.log(`Tomorrow: ${schedule.tomorrow} cards to review`);
```

---

## What's Next

- Add `type-answer` mode with AI evaluation (`POST /study/evaluate-answer`)
- Show a calendar heatmap with the schedule forecast endpoint
- Track long-term progress with the analytics endpoint
- Add competitive challenges with the [Versus Mode API](./build-quiz-game-with-flashlearn-api.md)

All of this works on the **Free tier** (100 generations/month, 1,000 API calls). No credit card needed.

[Get your API key](https://flashlearnai.witus.online/developer) and start building.
