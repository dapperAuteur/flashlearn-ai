# PRESS RELEASE

## FlashLearnAI.WitUS.Online Launches Free API for Language Learning — AI-Generated Vocabulary Flashcards with Smart Review Scheduling

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State] — March 2026** — FlashLearnAI.WitUS.Online today launched its Public API with specific capabilities for foreign language study, enabling language learning apps, tutoring platforms, and self-study tools to generate vocabulary flashcards and run spaced repetition review sessions via a simple REST API.

Language learning is one of the most popular use cases for flashcards. Whether studying for a college Spanish final, preparing for the JLPT Japanese exam, or building business French vocabulary, the core workflow is the same: learn a word, review it at increasing intervals, and test yourself until it sticks.

The FlashLearnAI.WitUS.Online API automates the entire process. Generate vocabulary cards from any language topic, track review schedules with the SM-2 spaced repetition algorithm, and even let AI grade typed answers — including handling the accent marks, character variations, and spelling differences that make language flashcards uniquely challenging.

### Language Learning Features

**AI Vocabulary Generation:**
Generate flashcards for any language topic:
- "Spanish: Restaurant Vocabulary" → 15 cards with Spanish terms on front, English definitions on back
- "Japanese: JLPT N5 Grammar Patterns" → 12 cards with grammar patterns and usage examples
- "French: Business Meeting Phrases" → 10 cards with formal French expressions

**Smart Answer Grading:**
Language answers are hard to grade automatically. "Café" and "cafe" should both be correct. "Ich spreche Deutsch" and "ich spreche deutsch" differ only in capitalization. The AI grading endpoint understands these nuances:
- Accepts accent variations (café = cafe = correct)
- Handles character set differences
- Recognizes synonyms across languages
- Gives partial credit with a similarity score (0-100%)

**Spaced Repetition for Vocabulary:**
The SM-2 algorithm is particularly effective for language vocabulary:
- New words start at 1-day intervals
- Mastered words extend to 30+ day intervals
- Forgotten words reset to 1-day for relearning
- Each word tracks its own schedule independently

**Competitive Vocabulary Challenges:**
Teachers and study groups can create vocabulary quiz challenges:
- Teacher generates cards from this week's lesson
- Creates a challenge and shares the 6-character code
- Students compete on accuracy, speed, and confidence
- Leaderboard motivates consistent study

### Who Benefits

**Language teachers:** Generate review materials for any lesson in seconds. Create weekly vocabulary quizzes as competitive challenges. Track which students are studying consistently via the analytics API.

**Language learning apps:** Integrate flashcard generation without building AI infrastructure. Use the spaced repetition API to handle review scheduling. Add competitive features with the Versus Mode API.

**Self-study learners:** The free tier (100 generations/month) is enough to generate vocabulary sets for daily study. The spaced repetition system handles scheduling so you never have to decide "what should I review today?"

**Tutoring platforms:** Generate custom vocabulary sets for each student's level. Track per-student progress via the analytics API. Create challenge quizzes between students to make sessions more engaging.

### Example: Building a Language Study App

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate vocabulary for this week
cards = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'Spanish: Food and Drink Vocabulary for Beginners',
}).json()['data']

print(f"Generated {cards['cardCount']} vocabulary cards")

# Check what's due for review
due = requests.get(f'{BASE}/study/due-cards', headers=headers).json()['data']
print(f"You have {due['totalDue']} words to review today")

# Check a student's typed answer
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': 'la manzana',
    'correctAnswer': 'La manzana',
    'question': 'How do you say "the apple" in Spanish?',
}).json()['data']

print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")
# Output: Correct: True, Similarity: 0.98
```

### Supported Languages

The AI generates flashcards in any language supported by Google's Gemini model, including but not limited to: Spanish, French, German, Japanese, Chinese (Mandarin), Korean, Portuguese, Italian, Arabic, Russian, Hindi, and dozens more.

### Pricing

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

### Getting Started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer) (free, no credit card)
2. Generate your first vocabulary set in 60 seconds
3. Beginner tutorials: [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started)

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. Built by WitUS.Online, a B4C LLC brand. Also by Anthony McDonald: [CentenarianOS.com](https://CentenarianOS.com), [AwesomeWebStore.com](https://AwesomeWebStore.com).

---

**Media inquiries:** support@flashlearnai.witus.online
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API Docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Portfolio:** [BrandAnthonyMcDonald.com](https://BrandAnthonyMcDonald.com)
