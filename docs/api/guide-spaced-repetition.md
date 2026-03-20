# Guide: Spaced Repetition (SM-2) API

FlashLearn uses the **SuperMemo 2 (SM-2) algorithm** — the same algorithm behind Anki — to schedule reviews at scientifically optimal intervals. This guide shows how to build a complete study app using the API.

---

## How SM-2 Works

Each card tracks four values:
- **Easiness Factor** (default 2.5) — How easy this card is for you. Drops when you get it wrong.
- **Interval** (days) — Days until next review. Grows exponentially with correct answers.
- **Repetitions** — Consecutive correct answers. Resets to 0 on any wrong answer.
- **Next Review Date** — When this card should next appear.

When you answer a card:
- **Correct**: Interval increases (1 day → 6 days → 6 × EF days → ...). Easiness factor adjusts based on confidence.
- **Incorrect**: Resets to 1-day interval, repetitions = 0. You see it again tomorrow.

---

## Workflow: Building a Study App

### Step 1: Check What's Due

```bash
GET /api/v1/study/due-cards
GET /api/v1/study/due-cards?setId=SET_ID   # Filter to one set
```

**Response:**
```json
{
  "data": {
    "sets": [
      {
        "setId": "abc123",
        "setName": "Biology: Cell Structure",
        "dueCount": 8,
        "dueCardIds": ["card1", "card2", "card3", "card4", "card5", "card6", "card7", "card8"]
      },
      {
        "setId": "def456",
        "setName": "Spanish Vocabulary",
        "dueCount": 3,
        "dueCardIds": ["card9", "card10", "card11"]
      }
    ],
    "totalDue": 11
  }
}
```

Display this in your app: "You have 11 cards to review across 2 sets."

### Step 2: Show the Review Schedule

```bash
GET /api/v1/study/due-cards/schedule
```

**Response:**
```json
{
  "data": {
    "today": 11,
    "tomorrow": 5,
    "thisWeek": 23,
    "next14Days": [
      { "date": "2026-03-20", "count": 11 },
      { "date": "2026-03-21", "count": 5 },
      { "date": "2026-03-22", "count": 0 },
      { "date": "2026-03-23", "count": 7 }
    ]
  }
}
```

Use this to show a calendar heatmap or workload forecast.

### Step 3: Start a Study Session

```bash
POST /api/v1/study/sessions
```

```json
{
  "setId": "abc123",
  "studyMode": "type-answer",
  "studyDirection": "front-to-back"
}
```

**Study modes:**
- `classic` — Show front, reveal back, self-grade
- `multiple-choice` — Pick from options
- `type-answer` — Type your answer, AI evaluates

**Response:**
```json
{
  "data": {
    "sessionId": "sess_xyz789",
    "setId": "abc123",
    "setName": "Biology: Cell Structure",
    "studyMode": "type-answer",
    "totalCards": 12,
    "flashcards": [
      { "id": "card1", "front": "What organelle produces ATP?", "back": "Mitochondria" },
      { "id": "card2", "front": "What is the cell membrane made of?", "back": "Phospholipid bilayer" }
    ]
  }
}
```

Cards are shuffled. Show them one at a time in your UI.

### Step 4: (Optional) AI Answer Evaluation

For `type-answer` mode, use AI to check answers:

```bash
POST /api/v1/study/evaluate-answer
```

```json
{
  "userAnswer": "mitocondria",
  "correctAnswer": "Mitochondria",
  "question": "What organelle produces ATP?"
}
```

**Response:**
```json
{
  "data": {
    "isCorrect": true,
    "similarity": 0.95,
    "feedback": "Correct! Minor spelling variation."
  }
}
```

The AI handles typos, synonyms, and partial answers. Threshold: similarity >= 0.7 = correct. This counts against your generation quota.

### Step 5: Complete the Session

After the user finishes all cards:

```bash
POST /api/v1/study/sessions/{sessionId}/complete
```

```json
{
  "results": [
    { "cardId": "card1", "isCorrect": true, "timeSeconds": 4.2, "confidenceRating": 5 },
    { "cardId": "card2", "isCorrect": false, "timeSeconds": 12.1, "confidenceRating": 2 },
    { "cardId": "card3", "isCorrect": true, "timeSeconds": 6.0, "confidenceRating": 4 }
  ]
}
```

**Confidence ratings (1-5):**
- 1 = Complete guess
- 2 = Very unsure
- 3 = Somewhat sure
- 4 = Fairly confident
- 5 = Absolutely certain

Confidence affects the SM-2 quality score: a confidently correct answer (5) gets a better score than a lucky guess (1).

**Response:**
```json
{
  "data": {
    "sessionId": "sess_xyz789",
    "status": "completed",
    "totalCards": 12,
    "completedCards": 3,
    "correctCount": 2,
    "incorrectCount": 1,
    "accuracy": 67,
    "durationSeconds": 22
  }
}
```

The SM-2 algorithm automatically reschedules each card based on the results.

### Step 6: View Analytics

```bash
GET /api/v1/study/analytics/{setId}
```

**Response:**
```json
{
  "data": {
    "analytics": {
      "setId": "abc123",
      "setPerformance": {
        "totalStudySessions": 5,
        "totalTimeStudied": 1200,
        "averageScore": 78
      },
      "cards": [
        {
          "cardId": "card1",
          "correctCount": 4,
          "incorrectCount": 1,
          "totalTimeStudied": 45,
          "sm2": {
            "easinessFactor": 2.6,
            "interval": 15,
            "repetitions": 4,
            "nextReviewDate": "2026-04-04T00:00:00.000Z"
          },
          "confidence": { "averageConfidence": 4.2 }
        },
        {
          "cardId": "card2",
          "correctCount": 1,
          "incorrectCount": 3,
          "sm2": {
            "easinessFactor": 1.8,
            "interval": 1,
            "repetitions": 0,
            "nextReviewDate": "2026-03-21T00:00:00.000Z"
          }
        }
      ]
    }
  }
}
```

Use this to show per-card mastery progress. Cards with low easiness factors and short intervals are the ones the user struggles with.

---

## Complete Example: React Study Component

```jsx
function StudySession({ setId, apiKey }) {
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [showBack, setShowBack] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // Start session on mount
  useEffect(() => {
    fetch('https://flashlearn.ai/api/v1/study/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, studyMode: 'classic' }),
    })
      .then(r => r.json())
      .then(({ data }) => { setSession(data); setStartTime(Date.now()); });
  }, [setId, apiKey]);

  const submitAnswer = (isCorrect, confidence) => {
    const card = session.flashcards[currentIndex];
    const timeSeconds = (Date.now() - startTime) / 1000;

    setResults(prev => [...prev, {
      cardId: card.id, isCorrect, timeSeconds, confidenceRating: confidence,
    }]);

    if (currentIndex + 1 < session.flashcards.length) {
      setCurrentIndex(prev => prev + 1);
      setShowBack(false);
      setStartTime(Date.now());
    } else {
      // Complete the session
      completeSession([...results, { cardId: card.id, isCorrect, timeSeconds, confidenceRating: confidence }]);
    }
  };

  const completeSession = async (allResults) => {
    const res = await fetch(`https://flashlearn.ai/api/v1/study/sessions/${session.sessionId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: allResults }),
    });
    const { data } = await res.json();
    alert(`Done! Accuracy: ${data.accuracy}%`);
  };

  if (!session) return <div>Loading...</div>;
  const card = session.flashcards[currentIndex];

  return (
    <div>
      <p>{currentIndex + 1} / {session.totalCards}</p>
      <div className="card">
        <h2>{card.front}</h2>
        {showBack && <p>{card.back}</p>}
      </div>
      {!showBack ? (
        <button onClick={() => setShowBack(true)}>Show Answer</button>
      ) : (
        <div>
          <button onClick={() => submitAnswer(false, 2)}>Wrong</button>
          <button onClick={() => submitAnswer(true, 4)}>Correct</button>
          <button onClick={() => submitAnswer(true, 5)}>Easy</button>
        </div>
      )}
    </div>
  );
}
```
