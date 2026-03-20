# FlashLearn AI API — Getting Started Guide

## Overview

The FlashLearn AI API lets you generate AI-powered flashcards, manage study content, run spaced repetition sessions, and create competitive quiz challenges — all via REST endpoints.

**Base URL:** `https://flashlearn.ai/api/v1`

**Interactive Docs:** [flashlearn.ai/docs/api](https://flashlearn.ai/docs/api) — visual API explorer where you can try endpoints live.

**OpenAPI Spec:** [flashlearn.ai/api/v1/openapi](https://flashlearn.ai/api/v1/openapi) — import into Postman, Insomnia, or any OpenAPI-compatible tool.

---

## 1. Create an Account and Get Your API Key

1. Sign up at [flashlearn.ai/auth/signup](https://flashlearn.ai/auth/signup)
2. Go to the **Developer Portal** at [flashlearn.ai/developer](https://flashlearn.ai/developer)
3. Click **API Keys** > **New Key**
4. Name your key (e.g., "My App - Production") and click **Create**
5. **Copy the key immediately** — it's shown once and starts with `fl_pub_`

## 2. Authentication

Every request requires a Bearer token in the `Authorization` header:

```
Authorization: Bearer fl_pub_your_key_here
```

## 3. Your First Request

Generate flashcards on any topic:

```bash
curl -X POST https://flashlearn.ai/api/v1/generate \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Introduction to Machine Learning"}'
```

**Response:**
```json
{
  "data": {
    "flashcards": [
      { "front": "What is supervised learning?", "back": "A type of ML where the model learns from labeled training data..." },
      { "front": "What is overfitting?", "back": "When a model performs well on training data but poorly on unseen data..." }
    ],
    "setId": "665f1a2b3c4d5e6f7a8b9c0d",
    "source": "generated",
    "cardCount": 10
  },
  "meta": {
    "requestId": "req_a1b2c3d4e5f6",
    "rateLimit": { "limit": 10, "remaining": 9, "reset": 1711843260 }
  }
}
```

## 4. Response Format

Every response follows the same envelope:

**Success:**
```json
{
  "data": { ... },
  "meta": { "requestId": "req_...", "rateLimit": { "limit": 10, "remaining": 9, "reset": 1711843260 } }
}
```

**Error:**
```json
{
  "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Rate limit exceeded. Try again shortly." },
  "meta": { "requestId": "req_..." }
}
```

## 5. Rate Limits

Every response includes these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per minute |
| `X-RateLimit-Remaining` | Requests remaining in this window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `X-Request-Id` | Unique request ID for debugging |
| `X-Overage` | Present (value `true`) when you've exceeded your monthly quota on a paid plan |

## 6. Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Key lacks permission or wrong key type |
| `RATE_LIMIT_EXCEEDED` | 429 | Per-minute burst limit hit |
| `QUOTA_EXCEEDED` | 429 | Monthly quota exhausted (Free tier hard cap) |
| `INVALID_INPUT` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `AI_GENERATION_FAILED` | 502 | Upstream AI provider error |
| `INTERNAL_ERROR` | 500 | Server error |

## 7. Pricing Quick Reference

| Tier | Price | Generations/mo | API Calls/mo | Burst |
|------|-------|---------------|-------------|-------|
| Free | $0 | 100 | 1,000 | 10/min |
| Developer | $19/mo | 5,000 | 50,000 | 60/min |
| Pro | $49/mo | 25,000 | 250,000 | 120/min |
| Enterprise | Custom | Unlimited | Unlimited | 300/min |

**Free tier is generous enough to build and test a prototype.** Developer and Pro tiers allow overage (billed per-generation) rather than hard-capping.

---

## What's Next?

- [Flashcard Generation Guide](./guide-generation.md) — Generate cards from topics, browse public sets
- [Spaced Repetition Guide](./guide-spaced-repetition.md) — Build a study app with SM-2 scheduling
- [Versus Mode Guide](./guide-versus-mode.md) — Create competitive quiz challenges
- [Interactive Docs](https://flashlearn.ai/docs/api) — Try every endpoint in your browser
