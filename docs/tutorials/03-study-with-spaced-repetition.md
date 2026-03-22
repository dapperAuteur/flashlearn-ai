# Tutorial 3: Study Smarter with Spaced Repetition

## What you'll learn

- What spaced repetition is (and why it helps you remember things)
- How to check which cards you need to study
- How to run a study session and submit your answers
- How to see your learning progress

## What you need

- Your API key
- At least one flashcard set (from Tutorial 1 or 2)

---

## What is spaced repetition?

Imagine you learn a new word today. If you don't review it, you'll forget it in a few days.

But if you review it **tomorrow**, then **3 days later**, then **a week later**, then **a month later** — you'll remember it for years.

That's spaced repetition. It's like a coach that tells you: "Hey, review this card now before you forget it!"

FlashLearnAI.WitUS.Online uses a formula called **SM-2** (the same one used by the popular app Anki) to figure out the perfect time to show you each card.

---

## Step 1: Check what's due

"Due" means "ready to review." Let's see what cards need your attention:

```bash
curl https://flashlearnai.witus.online/api/v1/study/due-cards \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

You'll see which sets have cards ready for review:

```json
{
  "data": {
    "sets": [
      { "setId": "abc123", "setName": "The Solar System", "dueCount": 5 }
    ],
    "totalDue": 5
  }
}
```

This says: "You have 5 cards to review in The Solar System."

---

## Step 2: See your study schedule

Want to know how many cards are coming up this week?

```bash
curl https://flashlearnai.witus.online/api/v1/study/due-cards/schedule \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

```json
{
  "data": {
    "today": 5,
    "tomorrow": 2,
    "thisWeek": 10,
    "next14Days": [
      { "date": "2026-03-22", "count": 5 },
      { "date": "2026-03-23", "count": 2 },
      { "date": "2026-03-24", "count": 0 },
      { "date": "2026-03-25", "count": 3 }
    ]
  }
}
```

Think of this like a homework calendar for your brain.

---

## Step 3: Start a study session

Time to study! Tell the API which set you want to review:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/sessions \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"setId": "abc123", "studyMode": "classic"}'
```

**Study modes:**
- `classic` — See the question, flip to see the answer, grade yourself
- `type-answer` — Type your answer and AI checks it (see Tutorial 4)
- `multiple-choice` — Pick from choices

The API gives you a **session ID** and a shuffled list of flashcards:

```json
{
  "data": {
    "sessionId": "sess_xyz789",
    "totalCards": 5,
    "flashcards": [
      { "id": "card1", "front": "What is the largest planet?", "back": "Jupiter" },
      { "id": "card2", "front": "Which planet has rings?", "back": "Saturn" }
    ]
  }
}
```

Now show these cards to the user one at a time!

---

## Step 4: Submit your results

After studying all the cards, tell the API how you did:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/sessions/sess_xyz789/complete \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      { "cardId": "card1", "isCorrect": true, "timeSeconds": 3.5, "confidenceRating": 5 },
      { "cardId": "card2", "isCorrect": false, "timeSeconds": 8.0, "confidenceRating": 2 }
    ]
  }'
```

For each card, you send:
- **isCorrect** — Did you get it right? `true` or `false`
- **timeSeconds** — How many seconds it took you
- **confidenceRating** — How sure were you? (1 = total guess, 5 = absolutely sure)

### What happened behind the scenes?

The SM-2 formula looked at each card and decided:
- **Card 1** (correct, confident): "Show this again in 6 days"
- **Card 2** (wrong): "Show this again tomorrow"

Cards you get right get pushed further into the future. Cards you get wrong come back quickly. That's the magic of spaced repetition!

---

## Step 5: Check your progress

See exactly how well you know each card:

```bash
curl https://flashlearnai.witus.online/api/v1/study/analytics/abc123 \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

```json
{
  "data": {
    "analytics": {
      "cards": [
        {
          "cardId": "card1",
          "correctCount": 4,
          "incorrectCount": 0,
          "sm2": {
            "easinessFactor": 2.6,
            "interval": 15,
            "nextReviewDate": "2026-04-06"
          }
        },
        {
          "cardId": "card2",
          "correctCount": 1,
          "incorrectCount": 2,
          "sm2": {
            "easinessFactor": 1.8,
            "interval": 1,
            "nextReviewDate": "2026-03-23"
          }
        }
      ]
    }
  }
}
```

What the numbers mean:
- **easinessFactor** — Higher = easier for you (2.5 is average, below 2.0 means you're struggling)
- **interval** — Days until the next review (higher = you know it well)
- **nextReviewDate** — When this card will show up again

---

## Try it yourself!

1. Check your due cards
2. Start a study session
3. Submit results for all cards
4. Check the analytics to see how SM-2 scheduled your reviews

---

## What's next?

Want the AI to check your typed answers automatically? That's in the next tutorial!

[Next: Let AI Grade Your Answers →](./04-ai-answer-checking.md)
