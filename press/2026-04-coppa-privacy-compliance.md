# PRESS RELEASE

## FlashLearnAI.WitUS.Online Ships Verified COPPA Cascade-Delete and Encrypted Webhook Secrets — Procurement-Ready Privacy for K-12 Vendors

**FOR IMMEDIATE RELEASE**

**Contact:** Anthony McDonald | BrandAnthonyMcDonald.com | WitUS.Online

---

**[City, State] — April 2026** — FlashLearnAI.WitUS.Online today announced production-ready privacy infrastructure that K-12 procurement teams and edtech vendors building consumer-facing learning products can point to as evidence of substantive compliance with the Children's Online Privacy Protection Act (COPPA): a single-call cascade-delete that purges every byte of child-derived data across five collections, AES-256-GCM encryption-at-rest for outbound webhook signing secrets, and a documented audit-log receipt for every privacy-rights invocation.

The announcement coincides with the launch of the FlashLearn Ecosystem API, which exposes these primitives to any consumer-facing learning product through a documented REST surface.

> [QUOTE: 1–2 sentence statement from BAM as founder — e.g., why building privacy as a first-class API endpoint matters for K-12 vendor evaluation.]

### What COPPA actually requires (and what most vendors hand-wave)

COPPA requires operators of services directed at children under 13 to provide parents with the right to review, delete, and refuse further collection of their child's personal information. In practice, most edtech vendors implement deletion as:

- A support-ticket workflow where deletion happens manually within "30 business days"
- A single `users` table delete that orphans related data in 4-7 other tables
- An undocumented ad-hoc process with no audit trail

The **`DELETE /api/v1/children/:childId`** endpoint replaces that with one call that:

1. Cancels any pending QStash-scheduled work for the child (next-day deck deliveries, in-flight webhook retries)
2. Deletes every `WebhookDelivery` audit row scoped to that child
3. Deletes every `CardAttempt` (per-card response log)
4. Deletes every `MasteryRollup` (per-standard performance summary)
5. Deletes every child-derived `FlashcardSet` (the deck content itself, since cards may quote child responses)
6. Deletes every `EcosystemSession` row
7. Inserts a `CascadePurgeLog` row recording the request ID, requester IP, timestamp, and per-collection purge counts

The endpoint is **idempotent**: re-invoking after a prior purge returns 200 with `purgedRecordCount: 0` because the purge-log row exists. Calling against a child that was never recorded returns 404 — distinguishing "deleted" from "never collected."

End-to-end test coverage in CI verifies that a subsequent `GET /api/v1/mastery/:childId` returns 404, proving the cascade actually purged the rollup data, not just the parent rows.

### Data minimization on outbound

When a session completes, FlashLearn dispatches an outbound webhook to the consumer's registered URL. Many vendors send these webhooks unsigned or signed with a static "shared secret" stored in plaintext. FlashLearn does neither.

- **HMAC-SHA256 signed bodies.** The `X-FlashLearn-Signature: sha256=<hex>` header is computed over the exact bytes of the POST body using the per-endpoint signing secret. Consumers verify with `crypto.timingSafeEqual`.
- **AES-256-GCM encryption-at-rest** for the signing secret. The plaintext secret is shown to the consumer once at registration (and on rotation) and is never recoverable after that, even by the FlashLearn DBA — only the production process with `WEBHOOK_ENCRYPTION_KEY` can decrypt and sign.
- **Self-service signing-secret rotation** at [/developer/webhooks](https://flashlearnai.witus.online/developer/webhooks). Rotation invalidates the old plaintext immediately; new deliveries use the new secret on the next call.
- **`X-FlashLearn-Delivery: <UUID>`** for idempotent retry handling — consumers dedupe on this so duplicate retries don't double-write.
- **`X-FlashLearn-Timestamp: <unix-seconds>`** for replay protection if the consumer chooses to enforce it.

### What the audit trail looks like

Every webhook delivery (success, failure, dead-letter) is persisted in a `WebhookDelivery` row visible at [/developer/webhooks](https://flashlearnai.witus.online/developer/webhooks):

- Event name, attempt number, last attempt timestamp, response status, response body snippet (first 1KB)
- Successful deliveries auto-purge after 30 days via a TTL index
- Dead-lettered deliveries persist indefinitely as a compliance receipt
- Manual "Replay" affordance for dead-lettered rows that need re-attempt after the consumer fixes their endpoint

Combined with the `CascadePurgeLog`, this gives K-12 procurement reviewers an end-to-end audit story: every webhook fired is logged; every child deletion is logged; both are queryable for the compliance window.

### What schools / districts can demand from us

When a district CIO sends FlashLearn AI a vendor questionnaire, the substantive answers are:

- **"How is child data deleted on parent request?"** → `DELETE /api/v1/children/:childId`. One call. Idempotent. Audit-logged. End-to-end test in CI.
- **"How are outbound integrations secured?"** → HMAC-SHA256 signed webhooks. Per-endpoint secrets encrypted at rest with AES-256-GCM. Self-service rotation.
- **"What happens if the integration fails?"** → 7-attempt exponential backoff over ~24 hours, then dead-letter. Auto-disable after 50 consecutive failures. All visible to the partner in their dashboard.
- **"Do you have a Data Processing Agreement?"** → Yes. A WitUS-internal DPA template covering processor/controller obligations, sub-processors (Vercel, MongoDB Atlas, Upstash, Google Gemini), and breach SLAs is in legal review; partner-specific copies signed before pilot launch.

### Procurement-ready answers, by checklist

| K-12 vendor evaluation question | FlashLearn AI answer |
|---|---|
| Documented data-deletion endpoint? | `DELETE /api/v1/children/:childId` — see [docs/api/children](https://flashlearnai.witus.online/docs/api/children) |
| Idempotent re-deletion? | Yes; returns 200 with count 0 on second call |
| Audit log of deletions? | `cascade_purge_logs` collection, 1 row per request |
| Outbound webhook signing? | HMAC-SHA256, raw body, per-endpoint secret |
| Webhook secret storage? | AES-256-GCM encrypted at rest |
| Webhook secret rotation? | Self-service, plaintext shown once |
| Webhook delivery audit? | `webhook_deliveries` collection + dashboard at /developer/webhooks |
| Dead-letter handling? | Auto-disable after 50 failures; dashboard surfaces dead-letters |
| End-to-end test for cascade? | `__tests__/api/v1/ecosystem/coppa-cascade.e2e.test.ts` |
| Data Processing Agreement? | Template in legal review; partner-specific copies signed before pilot |

### Why this matters now

K-12 procurement is tightening as state legislatures pass children's-privacy laws (California Age-Appropriate Design Code, Maryland Kids Code, EU Digital Services Act). Vendors who shrug at COPPA cascade-delete are increasingly disqualified from procurement before evaluation. Vendors whose privacy story is a documented endpoint plus an audit table are the ones moving through procurement faster.

### About FlashLearnAI.WitUS.Online

FlashLearnAI.WitUS.Online is an AI-powered learning platform combining flashcard generation, SM-2 spaced repetition, competitive study challenges, and a child-scoped Ecosystem API. The 27-endpoint Public API surface includes documented privacy primitives intended for substantive compliance, not just attestation. Built by WitUS.Online, a B4C LLC brand.

---

**Privacy / compliance inquiries:** [admin.flashlearnai@awews.com](mailto:admin.flashlearnai@awews.com)
**Cascade-delete endpoint docs:** [flashlearnai.witus.online/docs/api/children](https://flashlearnai.witus.online/docs/api/children)
**Webhook reference:** [flashlearnai.witus.online/docs/api/webhooks](https://flashlearnai.witus.online/docs/api/webhooks)
**Ecosystem API overview:** [flashlearnai.witus.online/docs/api/ecosystem](https://flashlearnai.witus.online/docs/api/ecosystem)
**Website:** [flashlearnai.witus.online](https://flashlearnai.witus.online)
