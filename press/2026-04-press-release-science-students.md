# PRESS RELEASE

## FlashLearnAI.WitUS.Online for Science Students: AI Flashcards for Anatomy, Periodic Table, Formulas, and Lab Protocols

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for biology, chemistry, and physics students at the high school AP / IB level and undergraduate level. The 27-endpoint Public API generates spaced-repetition decks for the dense factual content science classes throw at students: anatomical structures, the periodic table, physics formulas, chemical reaction types, taxonomic classifications, and lab safety protocols.

Science classes share a problem: heavy memorization burden on top of conceptual understanding. Anatomy demands hundreds of structure names. Inorganic chemistry demands the periodic table plus reaction patterns. Physics demands formula recall fluency before you can apply anything. Without spaced repetition, students cram before exams and forget within weeks. With it, the foundational knowledge stays accessible for the next course in the sequence.

### Science-specific use cases

**Anatomy & physiology.** Generate cards for skeletal system landmarks, muscle origins and insertions, cardiac cycle phases, nephron anatomy, neuron components. Each card pairs structure with function.

```
Topic: "Bones of the human hand and wrist"
→ Returns 15 cards: scaphoid, lunate, triquetrum, pisiform, trapezium, trapezoid, capitate, hamate plus the metacarpals and phalanges
```

**Periodic table.** Element symbols, atomic numbers, group properties, electron configurations, common ions. Generate by group, period, or category (alkali metals, halogens, noble gases, transition metals).

**Physics formulas.** Kinematics equations, Maxwell's equations, thermodynamic state functions, common units conversions. Each card front gives the equation; the back gives the variables, units, and a representative use case.

**Chemistry reaction types.** Combustion, single replacement, double replacement, acid-base neutralization, redox, esterification. Generate cards with the general form and a worked example.

**Taxonomic classifications.** Phyla, classes, orders, families. Useful for biology students drilling for systematics exams.

**Lab safety and protocols.** Hazard pictogram identification, common spill response, biosafety levels, glassware procedures. Generate from your specific lab manual or a topic prompt.

### AI answer grading handles scientific notation

Science answers have specific edge cases the AI handles:

- **Notation variations.** "9.81 m/s²" and "9.81 m s⁻²" both accepted.
- **Significant figures.** "3.14" and "3.14159" graded with similarity-aware partial credit.
- **Synonymous structure names.** "Femur" and "thigh bone" treated equivalently.
- **Unit conversions.** "1000 J" and "1 kJ" recognized as equivalent.

### Versus Mode for AP exam study groups

AP and IB exam prep classes often have a cohort sitting the same exam in May. Versus Mode turns weekly review into a competitive challenge: generate cards from this week's chapter, share a challenge code, see the leaderboard sort on accuracy plus speed plus confidence.

### Example: building a chemistry study tool

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate this week's reaction-types deck
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'Organic reactions: SN1 vs SN2 mechanisms with examples',
}).json()['data']

# Check what's due across all of organic chemistry
due = requests.get(f'{BASE}/study/due-cards', headers=headers).json()['data']

# Spaced repetition analytics for the set
analytics = requests.get(f'{BASE}/study/analytics/{deck["setId"]}', headers=headers).json()['data']
weak_cards = [c for c in analytics['cardPerformance'] if c['easinessFactor'] < 2.0]
print(f"Cards needing extra work: {len(weak_cards)}")
```

### Pricing

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

Free tier covers a single student's daily science study load. Pro tier covers a small AP study group or a teacher generating weekly review for multiple sections.

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer).
2. Generate your first anatomy or periodic-table deck in 60 seconds.
3. Beginner tutorials: [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
