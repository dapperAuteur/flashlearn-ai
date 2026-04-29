# PRESS RELEASE

## FlashLearnAI.WitUS.Online for Linguistics Students: Spaced Repetition for IPA, Syntax Trees, and Phoneme Inventories

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for linguistics undergraduate and graduate students. The 27-endpoint Public API now powers vocabulary and concept review for the kinds of content linguistics students actually need to memorize: IPA (International Phonetic Alphabet) symbols, phoneme inventories across languages, syntax-tree node types, morphological processes, and language-family relationships.

Linguistics is one of the most flashcard-friendly fields in the humanities. The discipline runs on terminology. Phonetics has the IPA chart. Phonology has phonotactic rules. Morphology has affix typologies. Syntax has X-bar theory and tree structures. Historical linguistics has sound-change correspondences across language families. Without spaced repetition, undergrads forget the IPA chart between classes. With it, the chart sticks.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### Linguistics-specific use cases

**IPA chart memorization.** Generate decks for consonant articulation (place + manner + voice), vowel placement (height + backness + roundedness), and diacritic functions. Each card front shows an IPA symbol; the back gives the articulatory description. AI-validated typed answers handle the formatting variations linguistics students actually use ("voiceless bilabial stop" / "voiceless bilabial plosive" both accepted).

**Phoneme inventories.** Generate cards for any language's phoneme set:

```
Topic: "Phoneme inventory of Japanese (consonants)"
→ Returns 15-20 cards with phoneme on front, articulatory description and minimal-pair example on back
```

**Syntax tree nodes.** Generate decks for X-bar theory components, theta roles, c-command relations, and movement constraints. Useful for syntax classes that test on tree-drawing fundamentals.

**Morphological processes.** Affixation, reduplication, suppletion, and inflection paradigms. Handy for Field Methods classes drilling on morpheme identification.

**Language families and Sapir-Whorf concepts.** Sociolinguistics and historical linguistics terminology. Generate from any topic: "Romance language family branches" or "Code-switching versus borrowing distinction."

### AI answer grading handles linguistics edge cases

Linguistics answers have nuances that frustrate naive grading systems. FlashLearn AI handles them:

- **Diacritic variations.** "Schwa" and "ə" both accepted for the same answer.
- **British / American terminology.** "Phonological derivation" and "phonological derivation rule" treated equivalently.
- **Equivalent phrasings.** "Voiceless palato-alveolar fricative" and "voiceless postalveolar fricative" both correct for /ʃ/.
- **Partial credit.** A typed answer that's 80% correct returns a similarity score so students can self-evaluate against the AI's threshold.

### Versus Mode for syntax study groups

Graduate seminars often have a small cohort drilling the same exam material. Versus Mode turns review into a competitive challenge with composite scoring (accuracy 40%, speed 25%, confidence calibration 20%, streak 15%). Generate cards from this week's syntax reading, share a 6-character challenge code in the group chat, see who knows the material best on the leaderboard.

### Example: building a linguistics study script

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate phonetics cards for next week
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'IPA consonants: voiceless and voiced obstruents',
}).json()['data']

print(f"Generated {deck['cardCount']} cards (set: {deck['setId']})")

# Check what's due for review across all sets
due = requests.get(f'{BASE}/study/due-cards', headers=headers).json()['data']
print(f"You have {due['totalDue']} cards to review today")

# Validate a typed answer with AI grading
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': 'voiceless bilabial plosive',
    'correctAnswer': 'voiceless bilabial stop',
    'question': 'What is /p/?',
}).json()['data']

print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")
# Output: Correct: True, Similarity: 0.96
```

### Pricing

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

Free tier is enough for one student's daily review across a typical course load.

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer) (free, no credit card).
2. Generate your first phoneme inventory or IPA review deck in 60 seconds.
3. Beginner tutorials: [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
