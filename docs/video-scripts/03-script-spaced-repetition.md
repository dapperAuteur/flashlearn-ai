# Video Script: Study Smarter with Spaced Repetition

**Duration:** 7-10 minutes
**Format:** Talking head intro/outro + screen recording

---

## INTRO (0:00 - 1:00)

**[ON CAMERA]**
"Here's a question: if you learned 50 new vocabulary words today, how many would you remember next week? Research says... about 10.

But there's a hack. It's called spaced repetition. It's the same technique used by medical students memorizing thousands of terms, by language learners, and by the app Anki — which has millions of users.

Today I'll show you how to add spaced repetition to ANY app using the FlashLearnAI.WitUS.Online API. It works automatically. You don't need to code the algorithm yourself."

**[PRODUCTION NOTE]** Show a forgetting curve graphic during "how many would you remember" — then show the spaced repetition curve that flattens out

---

## PART 1: What is Spaced Repetition? (1:00 - 2:00)

**[ON CAMERA]**
"Think of your brain like a muscle. If you lift weights once and never again, you lose the strength. But if you lift a little bit every few days, you get stronger over time.

Spaced repetition is the same idea. You review a flashcard today. Then tomorrow. Then three days later. Then a week. Then a month. Each time, the gap gets longer because your brain is getting stronger at remembering it.

The API uses a formula called SM-2. You don't need to understand the math. Just know this: cards you get RIGHT come back less often. Cards you get WRONG come back quickly."

**[PRODUCTION NOTE]** Simple animation showing a card moving further and further apart on a timeline as you get it correct. When you get it wrong, it snaps back to tomorrow.

---

## PART 2: Check What's Due (2:00 - 3:00)

**[SCREEN RECORDING]**

```bash
curl https://flashlearnai.witus.online/api/v1/study/due-cards \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[ON CAMERA - voiceover]**
"First, ask the API: what cards are due? These are cards whose review time has come."

**[SCREENSHOT]** Response showing sets with due counts

"It groups them by set and tells you how many are ready. Think of it like your study to-do list."

**[SCREEN RECORDING]** Show the schedule endpoint:

```bash
curl https://flashlearnai.witus.online/api/v1/study/due-cards/schedule \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

"And this shows your upcoming schedule. Today, tomorrow, the whole week. Like a homework calendar for your brain."

---

## PART 3: Start a Study Session (3:00 - 4:30)

**[SCREEN RECORDING]**

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/sessions \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"setId": "YOUR_SET_ID", "studyMode": "classic"}'
```

**[ON CAMERA - voiceover]**
"Now start a session. Tell it which set and what mode. Classic means you see the question, reveal the answer, and grade yourself."

"The API gives you back the cards in random order and a session ID. In your app, you'd show these one at a time."

**[PRODUCTION NOTE]** Quick mockup of what a study card UI might look like — question on front, tap to flip, see answer

---

## PART 4: Submit Your Results (4:30 - 6:00)

**[SCREEN RECORDING]**

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/sessions/SESSION_ID/complete \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      { "cardId": "card1", "isCorrect": true, "timeSeconds": 3.5, "confidenceRating": 5 },
      { "cardId": "card2", "isCorrect": false, "timeSeconds": 8.0, "confidenceRating": 2 }
    ]
  }'
```

**[ON CAMERA - voiceover]**
"After the user finishes all the cards, submit the results. For each card, you send: was it correct, how long it took, and how confident the user was on a scale of 1 to 5.

The confidence part is interesting. If you confidently get something RIGHT, that's great — the card gets pushed far into the future. But if you confidently get something WRONG, the algorithm knows you have a misconception and will show it more aggressively."

**[GOTCHA]** "timeSeconds should be how long the user spent on THAT card, not the whole session. And confidenceRating is 1 to 5 — 1 means 'total guess' and 5 means 'absolutely sure.'"

**[ON CAMERA - voiceover]**
"The API sends back your accuracy and duration. But the magic is happening behind the scenes — SM-2 just recalculated when every card should appear next."

---

## PART 5: Check Analytics (6:00 - 7:30)

**[SCREEN RECORDING]**

```bash
curl https://flashlearnai.witus.online/api/v1/study/analytics/YOUR_SET_ID \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[ON CAMERA - voiceover]**
"Now the cool part. You can see exactly how well the user knows each card."

**[SCREENSHOT]** Analytics response with SM-2 data

"Look at this. Each card shows:
- Easiness factor — 2.5 is average. Below 2.0 means you're struggling.
- Interval — how many days until the next review. Higher is better.
- Next review date — the exact day this card will be due again."

**[PRODUCTION NOTE]** Highlight a card with high interval (mastered) vs one with interval=1 (struggling). Visual comparison.

"Cards with long intervals are the ones you've nailed. Cards with short intervals need more work. Your app can use this to show progress bars, mastery percentages, whatever you want."

---

## OUTRO (7:30 - 8:00)

**[ON CAMERA]**
"That's spaced repetition via API. The algorithm handles all the scheduling. You just build the UI.

Next video: I'll show you how to let AI grade typed answers. Your users type their answer, and AI checks if it's right — even with typos and synonyms.

Subscribe so you don't miss it."

**[PRODUCTION NOTE]** End card. Include link to SM-2 Wikipedia article for curious viewers.
