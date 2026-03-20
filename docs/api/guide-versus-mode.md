# Guide: Versus Mode (Competitive Challenges) API

Build quiz competitions, classroom tournaments, or social learning features using the Versus API. Players compete on the same flashcard set and get scored on a 0-1000 composite scale.

---

## How Scoring Works

Each player gets a **Composite Score (0-1000)** based on four factors:

| Factor | Weight | Max Points | What It Measures |
|--------|--------|-----------|-----------------|
| Accuracy | 40% | 400 | Correct / Total cards |
| Speed | 25% | 250 | Average seconds per card (3s = max, 30s+ = 0) |
| Confidence Calibration | 20% | 200 | Knowing when you know (and when you don't) |
| Longest Streak | 15% | 150 | Consecutive correct answers / Total cards |

A player who's fast, accurate, confident when right, and uncertain when wrong will score close to 1000.

---

## Workflow: Running a Challenge

### Step 1: Create a Challenge

```bash
POST /api/v1/versus/challenges
```

```json
{
  "flashcardSetId": "abc123",
  "scope": "public",
  "studyMode": "classic",
  "studyDirection": "front-to-back",
  "maxParticipants": 10
}
```

**Scopes:**
- `direct` — 1v1 match (max 10 participants)
- `classroom` — Class competition (max 30)
- `public` — Open to anyone (max 50)

**Response:**
```json
{
  "data": {
    "challengeId": "ch_abc123",
    "challengeCode": "X7K2M9",
    "scope": "public",
    "studyMode": "classic",
    "cardCount": 15,
    "maxParticipants": 10,
    "expiresAt": "2026-03-23T10:00:00.000Z"
  }
}
```

Share the `challengeCode` with other players. Free tier challenges expire in 24h; paid in 72h.

### Step 2: Others Join

```bash
POST /api/v1/versus/join
```

```json
{
  "challengeCode": "X7K2M9"
}
```

**Response:**
```json
{
  "data": {
    "challengeId": "ch_abc123",
    "challengeCode": "X7K2M9",
    "setName": "Biology: Cell Structure",
    "studyMode": "classic",
    "cardCount": 15,
    "participantCount": 3
  }
}
```

### Step 3: Play the Challenge

```bash
POST /api/v1/versus/challenges/{challengeId}/play
```

**Response:**
```json
{
  "data": {
    "sessionId": "sess_xyz789",
    "challengeId": "ch_abc123",
    "studyMode": "classic",
    "studyDirection": "front-to-back",
    "flashcards": [
      { "id": "card1", "front": "What organelle produces ATP?", "back": "Mitochondria" },
      { "id": "card2", "front": "What is the powerhouse of the cell?", "back": "Mitochondria" }
    ]
  }
}
```

Cards are in the same order for all participants (shuffled once at challenge creation). Display them one at a time and collect answers.

**Important:** You need to save `CardResult` records for the session. Use the study session complete endpoint first, then complete the challenge:

```bash
POST /api/v1/study/sessions/{sessionId}/complete
```

```json
{
  "results": [
    { "cardId": "card1", "isCorrect": true, "timeSeconds": 3.5, "confidenceRating": 5 },
    { "cardId": "card2", "isCorrect": true, "timeSeconds": 5.2, "confidenceRating": 4 }
  ]
}
```

### Step 4: Complete the Challenge

```bash
POST /api/v1/versus/challenges/{challengeId}/complete
```

**Response:**
```json
{
  "data": {
    "compositeScore": {
      "totalScore": 847,
      "accuracyScore": 360,
      "speedScore": 210,
      "confidenceScore": 162,
      "streakScore": 115,
      "accuracy": 0.9,
      "averageTimeSeconds": 5.3,
      "longestStreak": 11
    },
    "rank": 1,
    "challengeStatus": "completed"
  }
}
```

When all participants complete (or decline), the challenge status changes to `"completed"` and ranks are assigned.

### Step 5: View the Leaderboard

```bash
GET /api/v1/versus/challenges/{challengeId}/board
```

**Response:**
```json
{
  "data": {
    "challengeId": "ch_abc123",
    "challengeCode": "X7K2M9",
    "setName": "Biology: Cell Structure",
    "status": "completed",
    "participants": [
      {
        "userName": "Alice",
        "rank": 1,
        "compositeScore": 847,
        "scoreBreakdown": {
          "accuracyScore": 360, "speedScore": 210,
          "confidenceScore": 162, "streakScore": 115,
          "accuracy": 0.9, "averageTimeSeconds": 5.3, "longestStreak": 11
        },
        "completedAt": "2026-03-20T15:30:00.000Z"
      },
      {
        "userName": "Bob",
        "rank": 2,
        "compositeScore": 723,
        "scoreBreakdown": { ... }
      }
    ]
  }
}
```

---

## Other Endpoints

### Browse Open Challenges

```bash
GET /api/v1/versus/open?page=1&limit=20
```

Returns active public challenges anyone can join.

### Get Your Stats

```bash
GET /api/v1/versus/stats
```

```json
{
  "data": {
    "stats": {
      "totalChallenges": 24,
      "wins": 15,
      "losses": 7,
      "draws": 2,
      "currentWinStreak": 3,
      "bestWinStreak": 8,
      "averageCompositeScore": 742,
      "highestCompositeScore": 923,
      "rating": 1247
    }
  }
}
```

The `rating` is an ELO-style score (starts at 1000) that adjusts with wins and losses.

### List Your Challenges

```bash
GET /api/v1/versus/challenges?status=active&page=1
```

Filter by `status`: `active`, `completed`, `expired`.

---

## Tier Limits for Versus

| Feature | Free Tier | Developer/Pro |
|---------|-----------|---------------|
| Challenges/day | 3 | Unlimited |
| Study modes | Classic only | Classic + Multiple Choice |
| Max participants | 5 | Up to 50 |
| Expiry | 24 hours | 72 hours |

---

## Example: Classroom Tournament

A teacher creates challenges for weekly review, students compete for top scores:

```python
import requests

API_KEY = 'fl_pub_teacher_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Teacher generates flashcards for the week's topic
gen = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'American Revolution: Key Battles',
    'title': 'Week 5 Review'
}).json()

set_id = gen['data']['setId']

# Create a classroom challenge
challenge = requests.post(f'{BASE}/versus/challenges', headers=headers, json={
    'flashcardSetId': set_id,
    'scope': 'classroom',
    'studyMode': 'classic',
    'maxParticipants': 30,
}).json()

code = challenge['data']['challengeCode']
print(f"Share this code with students: {code}")

# Later, check the leaderboard
board = requests.get(
    f"{BASE}/versus/challenges/{challenge['data']['challengeId']}/board",
    headers=headers,
).json()

for p in board['data']['participants']:
    print(f"  #{p['rank']} {p['userName']}: {p['compositeScore']} points")
```

---

## Example: React Challenge Component

```jsx
function ChallengeJoin({ apiKey }) {
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(null);

  const join = async () => {
    const res = await fetch('https://flashlearnai.witus.online/api/v1/versus/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeCode: code }),
    });
    const { data } = await res.json();
    setChallenge(data);
  };

  if (challenge) {
    return (
      <div>
        <h2>{challenge.setName}</h2>
        <p>{challenge.participantCount} players joined</p>
        <p>{challenge.cardCount} cards · {challenge.studyMode}</p>
        <button onClick={() => startPlaying(challenge.challengeId)}>
          Start Challenge
        </button>
      </div>
    );
  }

  return (
    <div>
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" maxLength={6} />
      <button onClick={join}>Join Challenge</button>
    </div>
  );
}
```
