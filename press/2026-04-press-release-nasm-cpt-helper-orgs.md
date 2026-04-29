# PRESS RELEASE

## FlashLearnAI.WitUS.Online for NASM CPT Educators and Study-Helper Organizations: A Spaced-Repetition Backend for Your CPT Prep Programs

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for NASM Certified Personal Trainer educators, study-helper organizations, and trainer mentors who run CPT exam prep programs. The 27-endpoint Public API exposes the spaced-repetition, AI generation, mastery analytics, and competitive Versus Mode primitives behind a documented REST surface, so coaches like Joe Drake and other CPT-prep operators can drop FlashLearn AI in as the retention layer behind their own programs without building it from scratch.

This release is the developer-integration counterpart to [the NASM CPT students release](2026-04-press-release-nasm-cpt-students.md). Same content domain. Different audience: organizations supporting students, not students themselves.

> [QUOTE: 1-2 sentence statement from BAM as founder, NASM CPT and CES holder.]

### Who this is for

- **Trainer-mentors running CPT prep cohorts.** Independent coaches like Joe Drake who teach CPT prep on the side and want a real retention tool, not just a Google Drive of slides.
- **Study-prep companies.** Trainer Academy, Show Up Fitness, Trainer Heroes, and similar businesses that compete on outcomes, not just content. Spaced-repetition retention is the differentiator their content alone can't deliver.
- **Gym-chain education programs.** Equinox, Lifetime Fitness, and similar gyms that run internal CPT prep for hire-track candidates and want measurable retention.
- **Continuing-education providers.** Anyone selling CECs to NASM-credentialed trainers can layer FlashLearn AI on top of their courses to handle the "did the learner actually retain the material" question.

### What the API gives you

The same 27 endpoints behind the consumer FlashLearn AI product, available to your application:

- AI flashcard generation from any NASM CPT topic
- SM-2 spaced repetition with per-card scheduling
- Per-card and per-set analytics (easiness factor, intervals, review history)
- AI-powered answer grading that handles fitness-industry terminology variations
- Versus Mode for cohort competitions with composite scoring
- White-label option (separate license, see [pricing](https://flashlearnai.witus.online/pricing))

### Anchor topics for CPT-prep generation

- OPT model phases (5 phases × acute variables grid)
- Kinetic chain checkpoints (5 checkpoints × overactive / underactive musculature)
- Postural distortion patterns (pronation distortion, lower-crossed, upper-crossed)
- Acute variables (sets, reps, intensity, tempo, rest)
- Muscle anatomy (origin, insertion, action)
- Behavioral coaching frameworks (SMART goals, transtheoretical model, OARS)

### Example: building a CPT-prep program on the API

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate this week's deck for the cohort
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'NASM OPT model: complete phase characteristics for all 5 phases',
}).json()['data']
print(f"Generated {deck['cardCount']} cards (set: {deck['setId']})")

# Per-student: surface their weakest 5 cards before exam day
analytics = requests.get(f'{BASE}/study/analytics/{deck["setId"]}', headers=headers).json()['data']
weak = sorted(analytics['cardPerformance'], key=lambda c: c['easinessFactor'])[:5]
for card in weak:
    print(f"Drill more: {card['front'][:80]}...")

# Validate a typed answer with similarity-aware grading
result = requests.post(f'{BASE}/study/evaluate-answer', headers=headers, json={
    'userAnswer': '85% 1RM with 4-6 reps for 4-6 sets',
    'correctAnswer': 'Phase 4 maximal strength: 85-100% 1RM, 1-5 reps, 4-6 sets',
    'question': 'What are Phase 4 (Maximal Strength) acute variables?',
}).json()['data']
print(f"Correct: {result['isCorrect']}, Similarity: {result['similarity']}")
```

### Versus Mode for cohort competition

Run weekly Versus Mode challenges across your cohort. Composite scoring (accuracy 40%, speed 25%, confidence calibration 20%, streak 15%) penalizes "confidently wrong" answers, which is the single most dangerous pattern for new trainers in the field. Drilling with confidence calibration is exam prep AND professional habit-building.

### Pricing for educators and orgs

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |
| Enterprise | Custom | Unlimited | Unlimited |

Most CPT-prep operators land on Developer ($19/mo) for early integration testing and Pro ($49/mo) for active programs. Enterprise is for white-label deployments where the program runs under your brand on its own domain.

For larger fitness-industry partnerships (NSCA, ACE, ISSA, gym chains running internal certifications) we negotiate custom Enterprise terms. Email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com).

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer) (free, no credit card).
2. Generate your first OPT-model or kinetic-chain deck in 60 seconds.
3. Read the integration tutorials at [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).
4. For white-label deployment ("FlashLearn-powered" CPT prep on your own domain), email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) with your program details.

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand. Founder Anthony McDonald is a NASM CPT and CES holder; the practitioner-credential perspective informs every fitness-industry release.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
**Companion student release:** [press/2026-04-press-release-nasm-cpt-students.md](2026-04-press-release-nasm-cpt-students.md)
