# PRESS RELEASE

## FlashLearnAI.WitUS.Online Updated for Language Learners: 27 Endpoints, Ecosystem Integration, and the Same Vocabulary Pipeline

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** This release refreshes the [March 2026 Language Learning announcement](press-release-language-students.md) with the current state of the FlashLearnAI.WitUS.Online platform. The Public API has grown from 23 to 27 documented REST endpoints. A new Ecosystem API surface lets institutional partners (language schools, tutoring platforms, immersion programs) integrate FlashLearn AI as a deeper backend for their own products. The core language-learning use case described in the original release is unchanged and now sits on a more capable platform.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### What's the same as March

Everything in the original Language Learning release still works:

- AI vocabulary generation in any language Gemini supports (Spanish, French, German, Japanese, Mandarin, Korean, Portuguese, Italian, Arabic, Russian, Hindi, and more)
- SM-2 spaced repetition tuned for vocabulary acquisition
- Smart answer grading with accent-mark and character-set tolerance
- Versus Mode for vocabulary challenges between students or study partners
- AI typed-answer evaluation for nuanced grading

### What's new since March

- **4 new endpoints** for the Ecosystem API: learner-scoped session scheduling (relevant to language schools running structured cohorts), per-topic mastery rollups (track which grammar patterns a learner has demonstrated), signed outbound webhooks (push completion events into your school's LMS), and cascade-delete for learner data on cohort completion.
- **A new `fl_eco_` API key type** for language schools, tutoring platforms, and immersion programs that want a deeper integration than the standard `fl_pub_` key offers.
- **Signed outbound webhooks** for tutoring platforms that need to ingest review completions into their session-tracking systems (HMAC-SHA256, 7-attempt retry, dead-letter dashboard).
- **Public docs** at [/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem) and [/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks).
- **Updated changelog** at [/changelog](https://flashlearnai.witus.online/changelog) with the full feature list since March.

### When the new endpoints matter for language learning

Most individual language learners won't need the Ecosystem API. The original Public API generation, study, and Versus endpoints cover self-study and study-group competition.

The Ecosystem API matters when you're building:

- **A language school's cohort progress dashboard.** Use `GET /mastery/:learnerId` to render per-grammar-pattern mastery state for each learner in the cohort.
- **A tutoring platform** that wants to embed spaced-repetition review into its booking system without managing the AI pipeline. Sign up for an `fl_eco_` key, integrate the four endpoints, ship in roughly 2 days.
- **A JLPT or DELE prep app** that wants to differentiate on retention measurement, not content generation. The mastery rollup endpoint surfaces per-topic mastery state across the exam blueprint.

### Example: building a JLPT N5 study app on the Public API

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate this week's JLPT N5 grammar deck
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'JLPT N5 grammar patterns: te-form usage and common applications',
}).json()['data']

# Check what's due across all of JLPT N5 prep
due = requests.get(f'{BASE}/study/due-cards', headers=headers).json()['data']
print(f"Cards due today: {due['totalDue']}")

# Validate an answer with accent-aware grading
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': 'taberu',
    'correctAnswer': 'taberu (たべる)',
    'question': 'How do you say "to eat" in Japanese (romaji)?',
}).json()['data']
print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")
```

### Pricing

Unchanged from March:

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

Free tier still covers an individual self-study learner. Pro tier covers a small school cohort or a tutoring platform's full integration.

### Getting started

1. If you signed up in March, your account and `fl_pub_` keys still work. Skip to step 3.
2. New users: sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer) (free, no credit card).
3. Generate your first vocabulary set in 60 seconds.
4. For institutional integration (language schools, tutoring platforms, exam prep companies), email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) to request an `fl_eco_` ecosystem key.

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, competitive study challenges, and a learner-scoped Ecosystem API. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand. Also by Anthony McDonald: [CentenarianOS.com](https://CentenarianOS.com), [AwesomeWebStore.com](https://AwesomeWebStore.com).

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Original March 2026 release:** [press/press-release-language-students.md](press-release-language-students.md)
**Portfolio:** [BrandAnthonyMcDonald.com](https://BrandAnthonyMcDonald.com)
