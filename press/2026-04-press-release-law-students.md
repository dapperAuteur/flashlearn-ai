# PRESS RELEASE

## FlashLearnAI.WitUS.Online for Law Students: AI Flashcards for Case Names, Black-Letter Rules, and Bar Prep

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State], April 2026.** FlashLearnAI.WitUS.Online today announced specific support for law students at the 1L, 2L, and 3L levels, plus bar exam candidates. The 27-endpoint Public API generates spaced-repetition decks for the high-stakes recall content law school requires: case names with holdings, black-letter rule statements, statutes and constitutional provisions, IRAC frameworks, and Bar exam topic outlines (MBE, MEE, MPT).

Law school is the canonical use case for spaced repetition. The body of doctrine that 1Ls have to recall by exam time runs into hundreds of cases per course. Black-letter rules need to surface during issue spotting in seconds, not minutes. Bar prep compresses three years of doctrine into eight weeks of intensive review. Without spaced repetition, students cram with commercial outlines and forget within months. With it, the doctrine sticks for the bar and beyond.

### Law-specific use cases

**Case briefs.** Generate cards for assigned reading with the case name on one side and the holding plus reasoning on the other.

```
Topic: "International Shoe v. Washington (specific personal jurisdiction holding)"
→ Returns cards covering the minimum contacts test, the purposeful availment requirement, and the fair play and substantial justice analysis
```

**Black-letter rules.** Generate decks for any doctrinal area: contract formation, intentional torts elements, mens rea categories, hearsay exceptions, federal civil procedure rules.

**Statutes and constitutional provisions.** Generate cards for individual provisions with the rule statement on the front and the cited authority plus modern application on the back. UCC sections, Federal Rules of Civil Procedure, Federal Rules of Evidence, key constitutional clauses.

**IRAC frameworks.** Generate cards that walk through Issue / Rule / Analysis / Conclusion structure for representative fact patterns. Useful for exam preparation when issue spotting needs to become reflexive.

**MBE topics.** Constitutional law, contracts, criminal law and procedure, evidence, real property, torts, civil procedure. Generate sub-topic decks for targeted review of weak areas.

**MEE topics.** Business associations, conflict of laws, family law, federal civil procedure, secured transactions, trusts and estates, UCC Article 9. Generate by topic for jurisdictions that test on each.

### AI answer grading handles legal edge cases

Legal answers have specific edge cases that frustrate naive grading:

- **Case-name variations.** "Brown v. Board" and "Brown v. Board of Education of Topeka" treated equivalently.
- **Citation formatting.** Bluebook variations recognized.
- **Equivalent rule statements.** "An offer is a manifestation of willingness to enter into a bargain" and "An offer requires a manifestation of present intent to be bound" graded with similarity-aware partial credit.
- **Holding versus dicta.** Cards explicitly distinguish, so practice answers focus on the binding rule.

### Versus Mode for study groups

Law school study groups have a strong tradition of competitive review. Versus Mode formalizes it. Generate cards from this week's contracts reading, share a 6-character challenge code with your study group, see the leaderboard sort on accuracy plus speed plus confidence.

The confidence-calibration component matters in legal practice. Lawyers who confidently misstate doctrine create malpractice exposure. Drilling with confidence calibration teaches students to flag uncertainty rather than guess.

### Example: building a bar prep study script

```python
import requests

API_KEY = 'fl_pub_your_key'
BASE = 'https://flashlearnai.witus.online/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Generate this week's MBE topic deck
deck = requests.post(f'{BASE}/generate', headers=headers, json={
    'topic': 'MBE Evidence: Hearsay exceptions under FRE 803 and 804',
}).json()['data']

# Check what's due for review across all bar-prep sets
due = requests.get(f'{BASE}/study/due-cards', headers=headers).json()['data']
print(f"Bar cards due today: {due['totalDue']}")

# Identify weakest topic areas before the bar
analytics = requests.get(f'{BASE}/study/analytics/{deck["setId"]}', headers=headers).json()['data']
weak = sorted(analytics['cardPerformance'], key=lambda c: c['easinessFactor'])[:10]
for card in weak:
    print(f"Drill more: {card['front'][:80]}...")
```

### Pricing

| Tier | Monthly Cost | Generations | API Calls |
|------|-------------|------------|-----------|
| Free | $0 | 100/month | 1,000/month |
| Developer | $19/month | 5,000/month | 50,000/month |
| Pro | $49/month | 25,000/month | 250,000/month |

Free tier covers one student's daily review across a typical 1L course load. Pro tier covers full bar prep for one candidate or a small study group.

### Getting started

1. Sign up at [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer).
2. Generate your first case-brief or rule-statement deck in 60 seconds.
3. Beginner tutorials: [flashlearnai.witus.online/docs/api/getting-started](https://flashlearnai.witus.online/docs/api/getting-started).

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, and competitive study challenges. 27 documented REST endpoints. Built by WitUS.Online, a B4C LLC brand.

---

**Media inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**API docs:** [flashlearnai.witus.online/docs/api](https://flashlearnai.witus.online/docs/api)
