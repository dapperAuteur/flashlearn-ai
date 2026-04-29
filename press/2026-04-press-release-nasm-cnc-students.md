# PRESS RELEASE

## FlashLearnAI.WitUS.Online for NASM CNC Candidates: Spaced Repetition for Macros, Micros, and Behavior-Change Models

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for candidates studying for the National Academy of Sports Medicine Certified Nutrition Coach (CNC) exam. The 27-endpoint Public API generates spaced-repetition decks for the recall content CNC requires: macronutrient roles and digestion pathways, micronutrient functions and food sources, energy systems and their substrate use, behavior-change models, and the motivational-interviewing skills that drive client adherence.

NASM CNC is built around an applied premise: a great nutrition coach knows the science cold so they can explain it simply to clients. Spaced repetition handles the science foundation. The exam tests both factual recall (vitamin K function, amino acid roles, digestion stages) and applied judgment (which behavior-change technique fits which client). Spaced repetition optimizes the recall layer so candidates can focus their prep on the applied scenarios.

> [QUOTE: 1-2 sentence statement from BAM as founder.]

### CNC-specific use cases

**Macronutrient deep-dive.** Protein, carbohydrate, fat. Each macro with its caloric density, primary roles, digestion pathway, recommended intake ranges, and the metabolic pathways it feeds.

```
Topic: "NASM CNC: protein quality scoring methods (PDCAAS, DIAAS, biological value)"
→ Returns cards covering the scoring systems, what they measure, common high-quality protein sources, and the limitations of each scoring method
```

**Micronutrients.** Fat-soluble vs water-soluble vitamins. Major and trace minerals. Each nutrient with its primary function, food sources, deficiency signs, and toxicity thresholds.

**Energy systems.** ATP-PC system, glycolysis, oxidative phosphorylation. Each system with its time domain, primary substrate, ATP yield, and the training contexts where it dominates.

**Behavior-change models.** Transtheoretical Model (stages of change), Self-Determination Theory (autonomy, competence, relatedness), Health Belief Model. Each model with its core constructs and the client situations where each applies.

**Motivational interviewing techniques.** OARS (Open-ended questions, Affirmations, Reflections, Summaries), reflective listening, eliciting change talk. Useful for client-coaching scenarios in exam items and in practice.

**Hydration and electrolytes.** Sodium, potassium, magnesium, calcium roles. Hydration assessment markers (urine color, body weight changes). Electrolyte deficits and replacement strategies.

### AI answer grading handles nutrition edge cases

CNC-specific answers have edge cases the AI handles:

- **Vitamin nomenclature.** "Vitamin B12" and "cobalamin" treated equivalently.
- **Macronutrient unit answers.** "4 calories per gram" and "4 kcal/g" both accepted for protein and carbohydrate energy density.
- **Behavior model variations.** "Stage of Change Model" accepted as equivalent to "Transtheoretical Model".
- **Equivalent food-source answers.** "Leafy greens" accepted as a category answer when the question asks for general sources of vitamin K.

### Versus Mode for nutrition study groups

CNC candidates often hold CPT or CES too. Study groups can drill the cross-credential overlap with Versus Mode: generate cards from this week's macronutrient or behavior-change chapter, share a challenge code with your group, see the leaderboard sort on accuracy plus speed plus confidence calibration.

The confidence-calibration component is professionally relevant. A nutrition coach who confidently misstates a vitamin function or a behavior-change construct can mislead a client into a worse outcome. Drilling with confidence ratings builds the habit of flagging uncertainty.

### Example: building a CNC study script

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate this week's micronutrient deck
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'NASM CNC: fat-soluble vitamins (A, D, E, K) functions, sources, deficiency signs',
}).json()['data']

# Validate a typed answer with similarity-aware grading
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': 'cobalamin, methyl group transfer for DNA synthesis',
    'correctAnswer': 'Vitamin B12 (cobalamin), methyl donor for DNA synthesis and red blood cell formation',
    'question': 'What is vitamin B12 and what does it do?',
}).json()['data']
print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")
```

### Pricing

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

Free tier covers a typical CNC candidate's daily prep across the 6-10 week study window most candidates use.

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer).
2. Generate your first macro / micro / behavior-change deck in 60 seconds.
3. Beginner tutorials: [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand. The Better Vice Club curriculum at Centenarian Academy LMS is informed by the same nutrition and behavior-change frameworks the NASM CNC tests on.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
