# Tutorial 4: Let AI Grade Your Answers

## What you'll learn

- How to let AI check if your typed answer is correct
- How the similarity score works
- How to handle typos and different wordings

## What you need

- Your API key
- A terminal or code editor

---

## Why use AI grading?

In "classic" study mode, you flip the card and decide yourself if you were right. But what if you want to **type** your answer and have the computer check it?

The problem is: answers aren't always exact. If the correct answer is "Mitochondria" and you type "mitocondria" (one letter off), a simple check would say you're wrong. But you clearly know the answer!

That's why FlashLearnAI.WitUS.Online has AI grading. It understands typos, synonyms, and different ways to say the same thing.

---

## Step 1: Check an answer

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

You send three things:
- **userAnswer** — What the student typed
- **correctAnswer** — The right answer from the flashcard
- **question** — The question (optional, but helps the AI understand context)

---

## Step 2: Read the result

```json
{
  "data": {
    "isCorrect": true,
    "similarity": 0.95,
    "feedback": "Correct! Minor spelling variation."
  }
}
```

What the numbers mean:
- **isCorrect** — `true` or `false`. The AI marks it correct if the similarity is 0.7 or higher.
- **similarity** — A number from 0.0 to 1.0. Think of it like a percentage: 0.95 means 95% match.
- **feedback** — A short message explaining the result.

---

## Step 3: See how it handles different situations

### Exact match
```json
{ "userAnswer": "Paris", "correctAnswer": "Paris" }
// Result: isCorrect = true, similarity = 1.0
```

### Typo
```json
{ "userAnswer": "Paaris", "correctAnswer": "Paris" }
// Result: isCorrect = true, similarity = 0.85
```

### Synonym (different word, same meaning)
```json
{ "userAnswer": "The powerhouse of the cell", "correctAnswer": "Mitochondria" }
// Result: isCorrect = true, similarity = 0.8
```

### Wrong answer
```json
{ "userAnswer": "Nucleus", "correctAnswer": "Mitochondria" }
// Result: isCorrect = false, similarity = 0.2
```

---

## Step 4: Use it in a study app

Here's how you'd use answer checking in JavaScript:

```javascript
async function checkAnswer(userAnswer, correctAnswer, question) {
  const response = await fetch('https://flashlearnai.witus.online/api/v1/study/evaluate-answer', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fl_pub_YOUR_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userAnswer, correctAnswer, question }),
  });

  const { data } = await response.json();

  if (data.isCorrect) {
    console.log('Correct! ' + data.feedback);
  } else {
    console.log('Not quite. The answer is: ' + correctAnswer);
    console.log('Feedback: ' + data.feedback);
  }

  return data.isCorrect;
}

// Try it
await checkAnswer('fotosynthesis', 'Photosynthesis', 'What process do plants use to make food?');
```

---

## Good to know

- AI grading uses your generation quota (each check counts as one generation call)
- It works best in English but can handle other languages
- If the API is overloaded, it might not be able to grade. Your app should handle errors:

```javascript
try {
  const result = await checkAnswer(userAnswer, correctAnswer, question);
} catch (error) {
  // Fall back to exact match if AI is unavailable
  const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
}
```

---

## Try it yourself!

1. Try checking a correct answer with a typo
2. Try checking a completely wrong answer
3. Try a synonym (same meaning, different words)

---

## What's next?

Ready to compete with friends? The next tutorial shows you how to create quiz challenges!

[Next: Challenge Your Friends to a Quiz Battle →](./05-challenge-your-friends.md)
