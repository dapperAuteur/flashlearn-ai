# PRESS RELEASE

## FlashLearnAI.WitUS.Online for NASM CNC Educators and Study-Helper Organizations: A Spaced-Repetition Backend for Your CNC Prep Programs

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for NASM Certified Nutrition Coach educators, nutrition study-helper organizations, and trainer-nutrition mentors who run CNC exam prep programs. The 27-endpoint Public API exposes spaced-repetition, AI generation, mastery analytics, and competitive Versus Mode primitives behind a documented REST surface, so nutrition educators can drop FlashLearn AI in as the retention layer behind their own programs.

This release is the developer-integration counterpart to [the NASM CNC students release](2026-04-press-release-nasm-cnc-students.md). Same content domain. Different audience: organizations supporting students, not students themselves.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### Who this is for

- **CNC-credentialed coaches running mentorship programs.** Often pair CNC prep with CPT prep for trainers who want both credentials.
- **Nutrition-prep companies.** Precision Nutrition prep groups, ISSA Nutrition prep, NCCPT-Nutrition educators.
- **Behavior-change consultancies.** Health coaches, intervention designers, and motivational-interviewing trainers who want a memorization layer for their clients' study material.
- **Sports nutrition certifications.** ISSN, CISSN, and other adjacent credentials with overlapping content.

### What the API gives you

The same 27 endpoints behind the consumer FlashLearn AI product, available to your application:

- AI flashcard generation from any CNC topic
- SM-2 spaced repetition tuned for vocabulary-heavy nutrition content
- Per-card and per-set analytics
- AI-powered answer grading that handles vitamin nomenclature + macronutrient unit variations
- Versus Mode for cohort competitions
- White-label option for branded CNC prep deployments

### Anchor topics for CNC-prep generation

- Macronutrient deep-dive (protein, carbohydrate, fat: caloric density, digestion, intake ranges)
- Micronutrients (fat- vs water-soluble vitamins, major + trace minerals, deficiency / toxicity)
- Energy systems (ATP-PC, glycolysis, oxidative phosphorylation)
- Behavior-change models (Transtheoretical, Self-Determination Theory, Health Belief)
- Motivational interviewing techniques (OARS framework, change talk)
- Hydration + electrolytes

### Example: building a CNC-prep program on the API

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate this week's micronutrient deck
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'NASM CNC: fat-soluble vitamins (A, D, E, K) functions, sources, deficiency signs',
}).json()['data']
print(f"Generated {deck['cardCount']} cards (set: {deck['setId']})")

# Validate a typed answer with similarity-aware grading
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': 'cobalamin, methyl group transfer for DNA synthesis',
    'correctAnswer': 'Vitamin B12 (cobalamin), methyl donor for DNA synthesis and red blood cell formation',
    'question': 'What is vitamin B12 and what does it do?',
}).json()['data']
print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")

# Identify weakest topic areas before exam day
analytics = requests.get(f'{BASE}/study/analytics/{deck["setId"]}', headers=headers).json()['data']
weak = sorted(analytics['cardPerformance'], key=lambda c: c['easinessFactor'])[:5]
for card in weak:
    print(f"Drill more: {card['front'][:80]}...")
```

### Versus Mode for cohort competition

Nutrition coaches misstate vitamin functions all the time. A coach who confidently tells a client "Vitamin C cures the common cold" creates a credibility leak. Versus Mode's confidence-calibration weight builds the habit of flagging uncertainty. Useful for both exam prep AND professional practice.

### Pricing for educators and orgs

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |
| Enterprise | Custom | Unlimited | Unlimited |

For nutrition-prep companies wanting white-label deployment, email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com).

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer).
2. Generate your first macro / micro / behavior-change deck.
3. Read the integration tutorials at [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand. The Better Vice Club curriculum at Centenarian Academy LMS is informed by the same nutrition and behavior-change frameworks the NASM CNC tests on.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Companion student release:** [press/2026-04-press-release-nasm-cnc-students.md](2026-04-press-release-nasm-cnc-students.md)
