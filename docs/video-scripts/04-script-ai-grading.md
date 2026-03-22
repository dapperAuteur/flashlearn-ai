# Video Script: Let AI Grade Your Answers

**Duration:** 4-6 minutes
**Format:** Talking head intro/outro + screen recording

---

## INTRO (0:00 - 0:30)

**[ON CAMERA]**
"What if your study app could grade typed answers — even when the student makes a typo? Or uses a synonym? Or writes the answer in a slightly different way?

That's exactly what the FlashLearnAI.WitUS.Online evaluate-answer endpoint does. Let me show you."

---

## PART 1: The Problem (0:30 - 1:15)

**[ON CAMERA]**
"Here's the problem. The correct answer is 'Mitochondria.' The student types 'mitocondria' — one letter off. A simple string comparison says WRONG. But clearly, the student knows the answer.

Or what about this: the correct answer is 'Mitochondria' and the student writes 'the powerhouse of the cell.' Same thing, totally different words.

That's why we use AI for grading. It understands meaning, not just exact text."

**[PRODUCTION NOTE]** Show side-by-side comparisons on screen: "mitocondria" vs "Mitochondria" with a red X, then the same with a green check from AI

---

## PART 2: Making the Call (1:15 - 2:30)

**[SCREEN RECORDING]**

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/evaluate-answer \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userAnswer": "mitocondria",
    "correctAnswer": "Mitochondria",
    "question": "What organelle produces ATP?"
  }'
```

**[ON CAMERA - voiceover]**
"Three fields. What the student typed. What the correct answer is. And optionally, the question — which helps the AI understand the context."

**[SCREENSHOT]** The response:

```json
{
  "data": {
    "isCorrect": true,
    "similarity": 0.95,
    "feedback": "Correct! Minor spelling variation."
  }
}
```

"isCorrect is true even though there's a typo. The similarity score is 0.95 — basically 95% match. And the feedback explains what happened."

---

## PART 3: What Counts as Correct? (2:30 - 3:30)

**[ON CAMERA]**
"The threshold is 0.7. Anything 70% similar or higher counts as correct. Let me show you some examples."

**[SCREEN RECORDING]** Show multiple calls with different inputs:

**[ON CAMERA - voiceover]**
"Exact match: similarity 1.0. Obviously correct.

Small typo: similarity 0.95. Correct.

Synonym — 'the powerhouse of the cell' for Mitochondria: similarity 0.8. Correct — the AI gets it.

Totally wrong — 'Nucleus' instead of 'Mitochondria': similarity 0.2. Incorrect."

**[PRODUCTION NOTE]** Show a quick table graphic with these 4 examples and their scores

**[GOTCHA]** "One thing to know: each evaluation call counts against your generation quota. So on the free tier, you get 100 per month. If you're building a study app with lots of users, you'll want the Developer or Pro tier."

---

## PART 4: Using It in Code (3:30 - 4:30)

**[SCREEN RECORDING]** Show VS Code:

```javascript
async function checkAnswer(userAnswer, correctAnswer, question) {
  const res = await fetch('https://flashlearnai.witus.online/api/v1/study/evaluate-answer', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fl_pub_YOUR_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAnswer, correctAnswer, question }),
  });
  const { data } = await res.json();
  return data; // { isCorrect, similarity, feedback }
}
```

**[ON CAMERA - voiceover]**
"In your app, you'd call this after the user types their answer. If isCorrect is true, show a green checkmark. If not, show the correct answer. And always show the feedback — it helps users learn."

**[GOTCHA]** "Pro tip: add a fallback. If the API is slow or unavailable, fall back to a simple string comparison. That way your app never breaks."

---

## OUTRO (4:30 - 5:00)

**[ON CAMERA]**
"That's AI answer grading. It's one endpoint, and it makes type-answer study mode possible.

Next and final video in this series: we're going multiplayer. I'll show you how to create quiz challenges where friends compete head-to-head. It's got scoring, leaderboards, the works.

See you there."
