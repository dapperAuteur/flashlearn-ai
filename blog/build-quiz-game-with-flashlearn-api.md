# Build a Multiplayer Quiz Game with the FlashLearn Versus API

Turn any topic into a competitive quiz in under 50 lines of code. The FlashLearn Versus API handles challenge creation, player matching, composite scoring, and leaderboards. You build the UI.

---

## What We're Building

A quiz game where:
1. A host generates flashcards and creates a challenge
2. Players join with a 6-character code
3. Everyone answers the same cards
4. A composite score (0-1000) ranks players by accuracy, speed, confidence, and streak
5. A leaderboard shows final standings

---

## The Composite Score

Players don't just compete on correctness. The scoring rewards well-rounded performance:

| Factor | Weight | How It Works |
|--------|--------|-------------|
| **Accuracy** (40%) | Getting cards right | 90% correct = 360/400 points |
| **Speed** (25%) | Answering quickly | 3 seconds/card = max, 30s+ = zero |
| **Confidence** (20%) | Calibration | High confidence + correct = good. Low confidence + wrong = also good (you knew you didn't know) |
| **Streak** (15%) | Consistency | 10 correct in a row out of 15 cards = 100/150 points |

---

## Step 1: Generate Cards + Create a Challenge

```javascript
const API_KEY = 'fl_pub_host_key';
const BASE = 'https://flashlearn.ai/api/v1';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  });
  return (await res.json()).data;
}

// Generate flashcards
const set = await api('POST', '/generate', { topic: 'World Capitals' });

// Create a public challenge
const challenge = await api('POST', '/versus/challenges', {
  flashcardSetId: set.setId,
  scope: 'public',
  studyMode: 'classic',
  maxParticipants: 20,
});

console.log(`Challenge created! Share this code: ${challenge.challengeCode}`);
// e.g., "X7K2M9"
```

## Step 2: Players Join

Each player needs their own API key (or your app backend uses a single key on behalf of users):

```javascript
// Player joins with the code
const joined = await api('POST', '/versus/join', {
  challengeCode: 'X7K2M9',
});

console.log(`Joined "${joined.setName}" — ${joined.participantCount} players so far`);
```

## Step 3: Play the Challenge

```javascript
// Start playing — get the cards
const game = await api('POST', `/versus/challenges/${challenge.challengeId}/play`);

console.log(`${game.flashcards.length} cards to answer`);

// Show cards one at a time, collect answers
const answers = [];
for (const card of game.flashcards) {
  const start = Date.now();

  // ... show card.front in your UI, let user answer ...
  const userSaidCorrect = true; // from your UI
  const confidence = 4;          // from your UI (1-5 scale)

  answers.push({
    cardId: card.id,
    isCorrect: userSaidCorrect,
    timeSeconds: (Date.now() - start) / 1000,
    confidenceRating: confidence,
  });
}

// Submit answers to the study session first
await api('POST', `/study/sessions/${game.sessionId}/complete`, { results: answers });
```

## Step 4: Get Your Score

```javascript
const score = await api('POST', `/versus/challenges/${challenge.challengeId}/complete`);

console.log(`Your score: ${score.compositeScore.totalScore}/1000`);
console.log(`  Accuracy:   ${score.compositeScore.accuracyScore}/400`);
console.log(`  Speed:      ${score.compositeScore.speedScore}/250`);
console.log(`  Confidence: ${score.compositeScore.confidenceScore}/200`);
console.log(`  Streak:     ${score.compositeScore.streakScore}/150`);

if (score.rank) console.log(`Rank: #${score.rank}`);
```

## Step 5: Show the Leaderboard

```javascript
const board = await api('GET', `/versus/challenges/${challenge.challengeId}/board`);

console.log(`\n--- ${board.setName} Leaderboard ---`);
for (const player of board.participants) {
  const medal = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '  ';
  console.log(`${medal} #${player.rank} ${player.userName}: ${player.compositeScore} pts`);
}
```

Output:
```
--- World Capitals Leaderboard ---
🥇 #1 Alice: 892 pts
🥈 #2 Charlie: 781 pts
🥉 #3 Bob: 654 pts
   #4 Diana: 543 pts
```

---

## Track Player Stats Over Time

```javascript
const stats = await api('GET', '/versus/stats');
console.log(`Rating: ${stats.stats.rating} ELO`);
console.log(`Record: ${stats.stats.wins}W - ${stats.stats.losses}L - ${stats.stats.draws}D`);
console.log(`Win streak: ${stats.stats.currentWinStreak} (best: ${stats.stats.bestWinStreak})`);
console.log(`Best score: ${stats.stats.highestCompositeScore}/1000`);
```

---

## Browse and Join Open Challenges

```javascript
// Find public challenges to join
const open = await api('GET', '/versus/open');

for (const c of open.challenges) {
  console.log(`"${c.setName}" — ${c.participantCount}/${c.maxParticipants} players — code: ${c.challengeCode}`);
}
```

---

## Use Case: Weekly Classroom Quiz

A teacher automates weekly review quizzes:

```python
import requests

API_KEY = 'fl_pub_teacher_key'
BASE = 'https://flashlearn.ai/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Monday: Generate cards from this week's lesson
set_data = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'Chapter 8: The American Civil War',
}).json()['data']

# Create a challenge for the class
challenge = requests.post(f'{BASE}/versus/challenges', headers=headers, json={
    'flashcardSetId': set_data['setId'],
    'scope': 'classroom',
    'maxParticipants': 30,
}).json()['data']

# Send the code to students via your LMS, Slack, email, etc.
print(f"This week's quiz code: {challenge['challengeCode']}")
print(f"Expires: {challenge['expiresAt']}")

# Friday: Check results
board = requests.get(
    f"{BASE}/versus/challenges/{challenge['challengeId']}/board",
    headers=headers,
).json()['data']

print(f"\n--- Week 8 Results ({len(board['participants'])} students) ---")
for p in board['participants']:
    sb = p['scoreBreakdown']
    print(f"  #{p['rank']} {p['userName']}: {p['compositeScore']} pts "
          f"(accuracy: {sb.get('accuracy', 0):.0%}, avg time: {sb.get('averageTimeSeconds', 0):.1f}s)")
```

---

## Free Tier is Enough to Start

- 100 AI generations/month = 100 quiz topics
- 1,000 API calls/month = dozens of games
- 3 challenges/day on Free, unlimited on Developer ($19/mo)

[Get your API key](https://flashlearn.ai/developer) and build your first quiz game today.
