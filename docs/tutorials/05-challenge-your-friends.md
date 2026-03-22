# Tutorial 5: Challenge Your Friends to a Quiz Battle

## What you'll learn

- How to create a quiz challenge anyone can join
- How the scoring system works (it's not just about getting answers right!)
- How to see the leaderboard and track your stats

## What you need

- Your API key
- A flashcard set (from Tutorial 1 or 2)
- A friend with an API key (or use a second key to simulate)

---

## How scoring works

When you challenge someone, you both answer the same flashcards. But your score isn't just about right and wrong. You get points for four things:

| What | Points | How |
|------|--------|-----|
| **Accuracy** | Up to 400 | How many you got right |
| **Speed** | Up to 250 | How fast you answered (3 seconds = max points) |
| **Confidence** | Up to 200 | Knowing when you know (and when you don't) |
| **Streak** | Up to 150 | Getting many right in a row |

Total: up to **1,000 points**.

A person who answers fast, correctly, and honestly about their confidence will score higher than someone who's just fast.

---

## Step 1: Create a challenge

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/versus/challenges \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flashcardSetId": "abc123",
    "scope": "public",
    "studyMode": "classic"
  }'
```

**Scope options:**
- `direct` — 1 vs 1 (up to 10 people)
- `classroom` — For a class (up to 30)
- `public` — Anyone can join (up to 50)

You'll get back a **challenge code**:

```json
{
  "data": {
    "challengeId": "ch_abc123",
    "challengeCode": "X7K2M9",
    "cardCount": 10,
    "expiresAt": "2026-03-23T10:00:00Z"
  }
}
```

**Share the code `X7K2M9` with your friends!** It's like a room code for a video game.

---

## Step 2: Friends join with the code

Your friend runs this with their own API key:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/versus/join \
  -H "Authorization: Bearer fl_pub_FRIEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{"challengeCode": "X7K2M9"}'
```

They're now in the challenge!

---

## Step 3: Play the challenge

Each player starts playing when they're ready:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/versus/challenges/ch_abc123/play \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

This gives you the flashcards in order and a **session ID**:

```json
{
  "data": {
    "sessionId": "sess_xyz",
    "flashcards": [
      { "id": "card1", "front": "What is the largest planet?", "back": "Jupiter" },
      { "id": "card2", "front": "What planet is closest to the Sun?", "back": "Mercury" }
    ]
  }
}
```

Everyone gets the same cards in the same order. That's what makes it fair!

---

## Step 4: Answer the cards

As each player answers, save the results. Then submit them:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/sessions/sess_xyz/complete \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      { "cardId": "card1", "isCorrect": true, "timeSeconds": 3.5, "confidenceRating": 5 },
      { "cardId": "card2", "isCorrect": true, "timeSeconds": 5.0, "confidenceRating": 4 }
    ]
  }'
```

---

## Step 5: Get your score

Now tell the challenge you're done:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/versus/challenges/ch_abc123/complete \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

```json
{
  "data": {
    "compositeScore": {
      "totalScore": 847,
      "accuracyScore": 400,
      "speedScore": 210,
      "confidenceScore": 160,
      "streakScore": 77
    },
    "rank": 1,
    "challengeStatus": "completed"
  }
}
```

847 out of 1,000 — nice score!

---

## Step 6: See the leaderboard

```bash
curl https://flashlearnai.witus.online/api/v1/versus/challenges/ch_abc123/board \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

```json
{
  "data": {
    "participants": [
      { "userName": "You", "rank": 1, "compositeScore": 847 },
      { "userName": "Friend", "rank": 2, "compositeScore": 723 }
    ]
  }
}
```

---

## Bonus: Check your all-time stats

```bash
curl https://flashlearnai.witus.online/api/v1/versus/stats \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

```json
{
  "data": {
    "stats": {
      "totalChallenges": 5,
      "wins": 3,
      "losses": 1,
      "draws": 1,
      "currentWinStreak": 2,
      "bestWinStreak": 3,
      "rating": 1120
    }
  }
}
```

Your **rating** starts at 1,000 and goes up when you win. It's like a video game ranking!

---

## Bonus: Browse open challenges

Want to join a random challenge? See what's available:

```bash
curl https://flashlearnai.witus.online/api/v1/versus/open \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

---

## Try it yourself!

1. Create a challenge and get the code
2. Have a friend join (or use a second API key)
3. Both play and submit results
4. Check the leaderboard to see who won!

---

## You did it!

You've completed all 5 tutorials. You can now:
- Generate flashcards from any topic
- Organize them into sets
- Study with spaced repetition
- Get AI to grade typed answers
- Challenge friends to quiz battles

Go build something awesome!

**Links:**
- [Interactive API Reference](https://flashlearnai.witus.online/docs/api) — Try every endpoint in your browser
- [Developer Portal](https://flashlearnai.witus.online/developer) — Manage your API keys
- [API Pricing](https://flashlearnai.witus.online/pricing) — Free tier: 100 generations/month
