# Video Script: Challenge Your Friends to a Quiz Battle

**Duration:** 7-10 minutes
**Format:** Talking head intro/outro + screen recording

---

## INTRO (0:00 - 0:45)

**[ON CAMERA]**
"What if studying felt like a game? Where you and your friends compete to see who knows the material best — and you get scored not just on what you know, but on how fast and confident you are?

That's Versus Mode. Today I'll show you how to build multiplayer quiz challenges with the FlashLearnAI.WitUS.Online API. This is probably the most fun feature to build."

**[PRODUCTION NOTE]** Upbeat energy. Consider a gaming-style lower third graphic. Maybe a quick montage of leaderboard results.

---

## PART 1: How Scoring Works (0:45 - 2:00)

**[ON CAMERA]**
"Before we build anything, let me explain how scoring works, because it's actually really clever.

Every player gets a score from 0 to 1,000. But it's not just about getting answers right. There are four parts:"

**[PRODUCTION NOTE]** Show animated graphic building up the score:

"Accuracy — worth up to 400 points. How many you got right.

Speed — up to 250 points. Answer in 3 seconds? Max points. Take 30 seconds? Zero speed points.

Confidence — up to 200 points. This is the unique one. If you say 'I'm very confident' and you're RIGHT, you get big points. If you say 'I'm not sure' and you're WRONG, you ALSO get points — because you knew you didn't know. That's called calibration.

And streak — up to 150 points. Get 10 in a row right? That's worth more than getting the same 10 right but scattered."

**[ON CAMERA]**
"So the perfect player isn't just smart. They're fast, honest about what they know, and consistent."

---

## PART 2: Create a Challenge (2:00 - 3:30)

**[SCREEN RECORDING]**

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/versus/challenges \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flashcardSetId": "YOUR_SET_ID",
    "scope": "public",
    "studyMode": "classic",
    "maxParticipants": 10
  }'
```

**[ON CAMERA - voiceover]**
"First, create a challenge. You need a flashcard set — either one you made or one you generated with AI. Pick a scope: direct for one-on-one, classroom for up to 30 students, or public for anyone."

**[SCREENSHOT]** Response with challengeCode highlighted

"See that challenge code? X-7-K-2-M-9. That's what you share with your friends. It's like a game room code."

**[GOTCHA]** "Free tier: 3 challenges per day, classic mode only, max 5 players. Developer and Pro tiers: unlimited challenges, multiple-choice mode, up to 50 players."

---

## PART 3: Join and Play (3:30 - 5:30)

**[SCREEN RECORDING]** — Show as if from a friend's perspective

```bash
# Friend joins
curl -X POST https://flashlearnai.witus.online/api/v1/versus/join \
  -H "Authorization: Bearer fl_pub_FRIEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{"challengeCode": "X7K2M9"}'
```

**[ON CAMERA - voiceover]**
"Your friend pastes in the code and they're in. Now both of you play."

```bash
# Start playing
curl -X POST https://flashlearnai.witus.online/api/v1/versus/challenges/CHALLENGE_ID/play \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

"This gives you the flashcards in order. Everyone gets the same cards in the same order — that's what makes it fair."

**[PRODUCTION NOTE]** Split screen showing both players getting the same cards

**[ON CAMERA - voiceover]**
"In your app, you'd show these cards one at a time. Track how long each answer takes. Ask for a confidence rating."

**[SCREEN RECORDING]** Submit results via study session complete:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/sessions/SESSION_ID/complete \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      { "cardId": "card1", "isCorrect": true, "timeSeconds": 3.5, "confidenceRating": 5 },
      { "cardId": "card2", "isCorrect": true, "timeSeconds": 5.0, "confidenceRating": 4 }
    ]
  }'
```

**[GOTCHA]** "There's a two-step process: first submit your card results to the study session, THEN complete the challenge. This is because the scoring engine reads from the study session results."

---

## PART 4: Get Your Score (5:30 - 7:00)

**[SCREEN RECORDING]**

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/versus/challenges/CHALLENGE_ID/complete \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[SCREENSHOT]** The composite score response — this is THE money shot for the thumbnail

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
    "rank": 1
  }
}
```

**[ON CAMERA - voiceover]**
"847 out of 1,000. Not bad! You can see exactly where the points came from. Perfect accuracy at 400, good speed at 210, solid confidence calibration, and a decent streak.

When everyone finishes, the API assigns ranks automatically."

**[PRODUCTION NOTE]** Show an animated bar chart building up the score components. This would make a great thumbnail image.

---

## PART 5: Leaderboard and Stats (7:00 - 8:30)

**[SCREEN RECORDING]**

```bash
# Leaderboard
curl https://flashlearnai.witus.online/api/v1/versus/challenges/CHALLENGE_ID/board \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[ON CAMERA - voiceover]**
"Check the leaderboard to see where everyone placed. Each player shows their rank, score, and full breakdown."

```bash
# Your all-time stats
curl https://flashlearnai.witus.online/api/v1/versus/stats \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

"And your all-time stats show wins, losses, win streaks, and your ELO rating. It starts at 1,000 and goes up when you win."

**[SCREEN RECORDING]** Browse open challenges:

```bash
curl https://flashlearnai.witus.online/api/v1/versus/open \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

"You can also browse public challenges that anyone can join. Great for finding random opponents."

---

## PART 6: Use Case — Classroom (8:30 - 9:15)

**[ON CAMERA]**
"Let me show you a real use case. You're a teacher. Every Friday, you want to run a quiz competition for your class."

**[SCREEN RECORDING]** Show a Python script:

```python
# Teacher's weekly quiz script
import requests

API_KEY = 'fl_pub_teacher_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate cards from this week's lesson
cards = requests.post(f'{BASE}/generate', headers=headers,
    json={'topic': 'Chapter 8: The Civil War'}).json()

# Create classroom challenge
challenge = requests.post(f'{BASE}/versus/challenges', headers=headers,
    json={'flashcardSetId': cards['data']['setId'], 'scope': 'classroom'}).json()

print(f"Quiz code: {challenge['data']['challengeCode']}")
```

**[ON CAMERA - voiceover]**
"Five lines of code. Generate cards from the lesson, create a challenge, share the code. Students join on their phones or laptops. Friday quiz done."

---

## OUTRO (9:15 - 9:45)

**[ON CAMERA]**
"That's the complete FlashLearnAI.WitUS.Online API series. You can now generate cards, manage sets, study with spaced repetition, get AI grading, and run competitive challenges — all through code.

Everything starts on the free tier. 100 generations per month. No credit card.

If you're building something with this API, I'd love to see it. Drop a link in the comments.

And if you found this series helpful — subscribe, share it with a friend, and I'll see you in the next one."

**[PRODUCTION NOTE]** End card with:
- Subscribe button
- Full playlist link
- Link to flashlearnai.witus.online/developer
- Link to flashlearnai.witus.online/docs/api
- Text: "Build your own study app — Free API"
