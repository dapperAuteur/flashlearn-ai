# PRESS RELEASE

## FlashLearnAI.WitUS.Online for NASM CES Educators and Study-Helper Organizations: A Spaced-Repetition Backend for Your CES Prep Programs

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for NASM Corrective Exercise Specialist educators, study-helper organizations, and post-CPT mentors who run CES exam prep programs. The 27-endpoint Public API exposes the spaced-repetition, AI generation, mastery analytics, and competitive Versus Mode primitives behind a documented REST surface, so trainer-mentors and CES-prep operators can drop FlashLearn AI in as the retention layer behind their own programs.

This release is the developer-integration counterpart to [the NASM CES students release](2026-04-press-release-nasm-ces-students.md). Same content domain. Different audience: organizations supporting students, not students themselves.

> [QUOTE: 1-2 sentence statement from BAM as founder and NASM CES holder.]

### Who this is for

- **CES-credentialed mentors.** Trainers who passed CES and now help others do the same. Often coaches running 1:1 mentorship or small cohorts.
- **Movement-screen and corrective-exercise companies.** Postural Restoration Institute (PRI) practitioners, Functional Movement Systems (FMS) educators, and similar specialty groups can use the API for vocabulary retention beyond their own protocols.
- **Physical therapy education programs.** PT schools running CES-equivalent units.
- **Gym corrective-exercise certifications.** Specialty gym networks training in-house corrective-exercise staff.

### What the API gives you

The same 27 endpoints behind the consumer FlashLearn AI product, available to your application:

- AI flashcard generation from any NASM CES topic
- SM-2 spaced repetition for assessment-flow + corrective-continuum content
- Per-card and per-set analytics (track which compensation patterns each student has cemented)
- AI-powered answer grading that handles compensation-language variations
- Versus Mode for cohort competitions with confidence-calibration scoring
- White-label option for branded CES prep deployments

### Anchor topics for CES-prep generation

- Assessment flow (static, transitional, dynamic)
- Corrective exercise continuum (inhibit, lengthen, activate, integrate)
- Common compensation patterns (knee valgus, low-back arch, forward head, rounded shoulders)
- Joint actions in three planes (sagittal, frontal, transverse)
- Length-tension relationships and reciprocal inhibition
- Population-specific overactive / underactive musculature

### Example: building a CES-prep program on the API

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate compensation-pattern deck for the cohort
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'NASM CES: lower extremity compensation patterns and corrective programming',
}).json()['data']

# Per-cohort: surface concepts students are collectively struggling with
analytics = requests.get(f'{BASE}/study/analytics/{deck["setId"]}', headers=headers).json()['data']
struggling = sorted(analytics['cardPerformance'], key=lambda c: c['easinessFactor'])[:5]
print(f"Cohort drill priority for next session:")
for card in struggling:
    print(f"  {card['front'][:80]}...")

# Validate compensation language with AI grading
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': 'trunk leans forward during overhead squat',
    'correctAnswer': 'Excessive forward lean during overhead squat assessment',
    'question': 'Describe the upper-body compensation that suggests overactive hip flexors.',
}).json()['data']
print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")
```

### Versus Mode for cohort competition

Confidence calibration matters more in CES than in CPT. A trainer who confidently programs the wrong stretch for an overactive muscle can worsen a compensation pattern in their client. Versus Mode's 20% confidence weight makes this an explicit training target during cohort review.

### Pricing for educators and orgs

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |
| Enterprise | Custom | Unlimited | Unlimited |

For movement-screen companies wanting white-label deployment ("[Your Company]-powered CES prep" on your own domain), email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com).

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer).
2. Generate your first compensation-pattern or assessment-flow deck.
3. Read the integration tutorials at [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand. Founder Anthony McDonald is a NASM CPT and CES holder.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Companion student release:** [press/2026-04-press-release-nasm-ces-students.md](2026-04-press-release-nasm-ces-students.md)
