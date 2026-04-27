# PRESS RELEASE

## WitUS Builds a Vertical Learning SaaS Platform — One API, Multiple Products

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State] — April 2026** — WitUS.Online, a B4C LLC brand, today announced that **FlashLearn AI now functions as the shared backend for the entire WitUS portfolio of learning products**, beginning with Wanderlearn Stories. The launch of FlashLearn's new Ecosystem API turns what was a single consumer flashcard product into a platform other vertical learning products can build on — including, by design, sister products in the WitUS portfolio.

This is the platform-thinking move that vertical SaaS investors and corporate L&D buyers have been asking edtech companies to make for years.

> [QUOTE: 1–2 sentence statement from BAM as founder of WitUS — e.g., the strategic thesis behind building a portfolio that shares infrastructure.]

### The platform model

Most edtech companies build features. WitUS builds a platform.

The thesis: every learning product needs the same three primitives — content generation, spaced-repetition scheduling, and learner mastery measurement. Building those three things from scratch is what kills new edtech products before they ship. WitUS solved them once inside FlashLearn AI, then exposed them as the Ecosystem API so:

1. **The next WitUS sub-product** can launch in days instead of months. Wanderlearn Stories is proof.
2. **External edtech partners** can integrate the same backend that powers two production products, without taking on the AI/SR/compliance burden themselves.
3. **The shared backend gets stronger with every consumer.** When Wanderlearn flags a timezone bug in scheduling, every future ecosystem partner benefits from the fix.

### What's already shared

| Product | Audience | Uses FlashLearn for |
|---|---|---|
| **FlashLearnAI.WitUS.Online** | Consumer flashcard learners (students, self-study) | Itself — the original product |
| **Wanderlearn Stories** | Ages 4-7, Indiana Kindergarten | Spaced-repetition deck scheduling, mastery rollups, COPPA-compliant child data, signed webhook callbacks to its parent dashboard |

Both products run on:
- The same Mongo cluster (separated by `(apiKeyId, childId)` scoping at the data layer)
- The same Gemini AI generation pipeline (per-key-type Gemini API keys for cost isolation)
- The same Upstash Redis rate-limit fabric
- The same Upstash QStash delayed-job system for next-day deck delivery and webhook retries

Each product gets its own audience-facing brand, domain, and design language. FlashLearn does the un-fun infrastructure once.

### What's coming

The Ecosystem API is live and documented. The next WitUS portfolio products in flight will ship as further proof that the platform model compresses time-to-market: a new product takes ~2 days of integration work on the consumer side instead of the typical 3–6 month buildout for AI generation + spaced repetition + child-safe data handling.

External partners are welcome. The Ecosystem API uses an admin-issued `fl_eco_` key type so we can vet integrations against the COPPA / data-handling expectations the API design assumes.

### Why this matters for edtech investors

Vertical SaaS companies typically hit a "feature factory" wall: every new market requires a new product, and every new product reinvents the same infrastructure. The platform model breaks that cycle:

- **Lower marginal cost** per product launch — infrastructure amortizes across the portfolio.
- **Faster experimentation** — a new product idea can ship as a thin shell on top of the API to test the market before deeper investment.
- **Defensible moat** — the shared backend gets compounding investment that point-solution competitors can't match.
- **Optional API revenue** — the same surface that powers internal products is sold to external partners at standard tiers.

WitUS is small enough to do this naturally; large enough that the moat is real.

### Why this matters for corporate L&D buyers

Procurement teams evaluating learning vendors increasingly want to know: *what backend is this built on, who else uses it, and how durable is it?* A vendor whose product runs on a multi-product platform answers all three questions favorably. When you license Wanderlearn Stories, you're also implicitly licensing a backend that powers a second consumer product and is open to additional partners — meaning the infrastructure won't bit-rot if any single product loses traction.

For L&D buyers building internal learning tools: the same Ecosystem API that powers Wanderlearn is available for in-house use. Drop the spaced-repetition + mastery layer in, keep your existing UI.

### Pricing for partners

Ecosystem keys (`fl_eco_`) have their own tier table, separate from the public-developer (`fl_pub_`) tier. Free tier covers most early-integration testing. Custom Enterprise pricing for higher-volume partners.

| Tier | Price | Generations/mo | API Calls/mo |
|------|-------|---------------|--------------|
| Free | $0 | 1,000 | 10,000 |
| Developer | $19/mo | 10,000 | 100,000 |
| Pro | $49/mo | 50,000 | 500,000 |
| Enterprise | Custom | Unlimited | Unlimited |

### Talk to us

WitUS is actively in conversation with prospective ecosystem partners and edtech investors interested in the platform thesis. To request a partner conversation, email [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com) with subject "Ecosystem partner inquiry" and a one-paragraph description of your product.

### About the WitUS portfolio

WitUS.Online is a B4C LLC brand building a portfolio of learning products on a shared platform. Current products include FlashLearnAI.WitUS.Online (consumer flashcards), Wanderlearn Stories (immersive K-grade learning), and additional products in development. Founder portfolio: [BrandAnthonyMcDonald.com](https://BrandAnthonyMcDonald.com).

---

**Investor / partner inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**FlashLearn AI:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
**Wanderlearn Stories:** [stories.wanderlearn.witus.online](https://stories.wanderlearn.witus.online)
**Ecosystem API docs:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
**Founder portfolio:** [BrandAnthonyMcDonald.com](https://BrandAnthonyMcDonald.com)
