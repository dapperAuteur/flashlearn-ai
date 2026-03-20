# FlashLearn AI - Public Developer API Implementation Plan

## Context

FlashLearn AI is an AI-powered flashcard platform with ~100 internal API routes, Stripe billing, Upstash Redis rate limiting, and Google Gemini AI generation. **No major flashcard platform (Quizlet, Brainscape, StudySmarter, Anki) offers a public developer API** -- FlashLearn would be first-to-market.

The goal is to expose a public API with a free tier for testing, paid tiers based on market research, and proper API key management and billing.

### Separate Gemini API Keys Per Key Type

Each API key type uses its own Gemini API key (provided by admin) so costs are tracked separately at the Google Cloud level:

| Key Type | Env Variable | Purpose |
|----------|-------------|---------|
| Admin | `GEMINI_API_KEY_ADMIN` | Admin testing, unlimited |
| App | `GEMINI_API_KEY_APP` | Internal app usage |
| Public | `GEMINI_API_KEY_PUBLIC` | External developer usage (billed) |
| Admin Public | `GEMINI_API_KEY_ADMIN_PUBLIC` | Owner's cross-app usage |
| Fallback | `GEMINI_API_KEY` | Legacy / default fallback |

This lets you monitor per-key-type costs directly in the Google Cloud console and set budget alerts independently.

### AI Cost Basis
- Gemini 2.0 Flash: ~$0.00045 per generation request
- Gemini 2.5 Flash: ~$0.00265 per request
- **Gemini 2.0 Flash is deprecated -- shuts down June 1, 2026** (must migrate)

### Market-Competitive Pricing

| Tier | Price | Generations/mo | API Calls/mo | Overage |
|------|-------|---------------|-------------|---------|
| **Free** | $0 | 100 | 1,000 | Hard cap |
| **Developer** | $19/mo | 5,000 | 50,000 | $0.005/gen |
| **Pro** | $49/mo | 25,000 | 250,000 | $0.003/gen |
| **Enterprise** | Custom | Unlimited | Unlimited | Volume discounts |

At $0.003-$0.005/gen we get 2x-10x margin over Gemini costs.

---

## Phase 1: API Key System + Core Endpoints (Weeks 1-3)

### 1A. API Key Types

Four distinct key types, each with a different purpose, prefix, and scope:

| Key Type | Prefix | Purpose | Who Creates | Rate Limits | Scope |
|----------|--------|---------|-------------|-------------|-------|
| **Admin** (`admin`) | `fl_admin_` | Admin endpoints (user mgmt, analytics, flags, campaigns) | Admin users only | Unlimited | `/api/admin/*`, `/api/v1/*` |
| **App** (`app`) | `fl_app_` | Internal app use (server-to-server calls from FlashLearn web/mobile) | System / Admin | High limits, no billing | `/api/*` internal routes |
| **Public** (`public`) | `fl_pub_` | External developers using the public API | Any registered user | Tier-based (Free/Dev/Pro/Enterprise) | `/api/v1/*` only |
| **Admin Public** (`admin_public`) | `fl_adm_pub_` | Owner (you) testing public API + using in your other apps | Admin users only | Unlimited, no billing | `/api/v1/*` (bypasses quotas) |

**Why separate types matter:**
- **Admin keys** let you call admin endpoints programmatically (dashboards, scripts, monitoring) without session cookies
- **App keys** replace hardcoded internal calls and let you track app-level usage, rotate credentials, and secure server-to-server communication
- **Public keys** are what external developers get -- metered, billed, rate-limited
- **Admin Public keys** give you full public API access without hitting quotas, so you can freely integrate FlashLearn generation into your other projects

### 1B. New Models

**`/models/ApiKey.ts`** -- API key storage
- `userId` (ObjectId, ref User)
- `name` (String, human-readable label)
- `keyType` (enum: `admin`, `app`, `public`, `admin_public`, required)
- `keyPrefix` (String, unique, first 12 chars for display)
- `keyHash` (String, SHA-256 hash of full key)
- `apiTier` (enum: Free, Developer, Pro, Enterprise -- only relevant for `public` keys, default Free)
- `status` (enum: active, revoked, expired)
- `permissions` (String array -- scoped per keyType, see below)
- `allowedRoutes` (String array, optional -- regex patterns for route restrictions, e.g. `["/api/v1/*"]`)
- `expiresAt`, `lastUsedAt`, `usageCount`, `revokedAt`
- Indexes: `{ keyHash: 1 }` unique, `{ userId: 1, status: 1, keyType: 1 }`, `{ keyPrefix: 1 }` unique

**Default permissions per key type:**

| Key Type | Default Permissions |
|----------|-------------------|
| `admin` | `admin:*`, `generate`, `sets:*`, `study:*`, `users:*`, `analytics:*` |
| `app` | `generate`, `sets:read`, `sets:write`, `study:*`, `categories:read` |
| `public` | `generate`, `sets:read`, `sets:write`, `sets:explore`, `categories:read` |
| `admin_public` | Same as `public` but with `admin:bypass_quota` flag |

**Key generation per type:**
- `admin`: `fl_admin_` + `crypto.randomBytes(32)` -> base64url
- `app`: `fl_app_` + `crypto.randomBytes(32)` -> base64url
- `public`: `fl_pub_` + `crypto.randomBytes(32)` -> base64url (+ `_test` suffix in dev)
- `admin_public`: `fl_adm_pub_` + `crypto.randomBytes(32)` -> base64url

Store SHA-256 hash only; show plaintext once at creation.

**`/models/ApiUsage.ts`** -- Per-key monthly usage tracking
- `apiKeyId`, `userId`, `periodStart`, `periodEnd`
- `apiCalls`, `generationCalls`, `overageCalls`
- Compound index: `{ apiKeyId: 1, periodStart: 1 }` unique

**`/models/ApiLog.ts`** -- Granular request log (90-day TTL)
- `apiKeyId`, `endpoint`, `method`, `statusCode`, `responseTimeMs`, `ip`, `userAgent`, `timestamp`

### 1C. Authentication Middleware

**`/lib/api/authenticateApiKey.ts`** -- Core API key auth (separate from NextAuth)
1. Extract `Authorization: Bearer fl_...` header
2. Detect key type from prefix (`fl_admin_`, `fl_app_`, `fl_pub_`, `fl_adm_pub_`)
3. SHA-256 hash the key -> lookup by `keyHash` where `status === 'active'`
4. Validate key type matches the route context (e.g., `admin` key can't be used if `allowedKeyTypes` doesn't include it)
5. Check key not expired, user not suspended
6. For `admin` and `admin_public` keys: verify user has Admin role
7. Update `lastUsedAt` / `usageCount` async (fire-and-forget)
8. Return `{ user, apiKey, keyType, apiTier }`

**`/lib/api/withApiAuth.ts`** -- Composable wrapper combining auth + rate limit + usage tracking
```typescript
export function withApiAuth(handler: ApiHandler, options?: {
  requiredPermission?: string;
  allowedKeyTypes?: ('admin' | 'app' | 'public' | 'admin_public')[];
}): (request: NextRequest) => Promise<NextResponse>;
```

**Route-level key type enforcement examples:**
- `/api/v1/generate` -- `allowedKeyTypes: ['public', 'admin_public', 'admin']`
- `/api/v1/sets` -- `allowedKeyTypes: ['public', 'admin_public', 'app', 'admin']`
- `/api/admin/*` -- `allowedKeyTypes: ['admin']`
- Internal routes using app keys -- `allowedKeyTypes: ['app', 'admin']`

Note: `middleware.ts` already excludes `/api` from NextAuth checks, so no changes needed.

### 1D. Rate Limiting

**`/lib/ratelimit/rateLimitApi.ts`** -- Extends existing Upstash infrastructure

**Rate limits by key type:**

| Key Type | Burst (req/min) | Monthly Generations | Monthly API Calls | Billing |
|----------|-----------------|--------------------|--------------------|---------|
| `admin` | Unlimited | Unlimited | Unlimited | None |
| `app` | 300 | 50,000 | 500,000 | None (internal) |
| `public` (Free) | 10 | 100 | 1,000 | Hard cap |
| `public` (Developer) | 60 | 5,000 | 50,000 | Overage billed |
| `public` (Pro) | 120 | 25,000 | 250,000 | Overage billed |
| `public` (Enterprise) | 300 | Unlimited | Unlimited | Custom |
| `admin_public` | Unlimited | Unlimited | Unlimited | None |

Two layers for `public` keys:
1. **Burst limiting** (per-minute): via Upstash sliding window
2. **Monthly quota** (from `ApiUsage`): cached in Redis for 60s

`admin`, `admin_public`, and `app` keys skip monthly quota checks entirely. `app` keys still have burst limits to prevent runaway internal bugs.

Reuses `getRateLimiter()` from existing `/lib/ratelimit/ratelimit.ts`.

### 1D. API Response Standards

**`/lib/api/apiResponse.ts`** + **`/lib/api/apiErrors.ts`**

Standard envelope:
```json
{
  "data": { ... },
  "meta": { "requestId": "req_abc", "rateLimit": { "limit": 60, "remaining": 57, "reset": 1711000000 } }
}
```

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

Error codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `RATE_LIMIT_EXCEEDED` (429), `QUOTA_EXCEEDED` (429), `INVALID_INPUT` (400), `NOT_FOUND` (404), `AI_GENERATION_FAILED` (502)

### 1E. V1 Endpoints

All under `/app/api/v1/`:

| Route | Method | Description | Extracts Logic From |
|-------|--------|-------------|-------------------|
| `/v1/generate` | POST | Generate flashcards from text | `/api/generate-flashcards/route.ts` |
| `/v1/generate/pdf` | POST | Generate from PDF | `/api/generate-flashcards/pdf/route.ts` |
| `/v1/generate/youtube` | POST | Generate from YouTube | `/api/generate-flashcards/youtube/route.ts` |
| `/v1/sets` | GET | List user's sets | `/api/flashcards/route.ts` |
| `/v1/sets` | POST | Create set | `/api/flashcards/route.ts` |
| `/v1/sets/:id` | GET/PATCH/DELETE | Set CRUD | `/api/sets/[id]/route.ts` |
| `/v1/sets/explore` | GET | Browse public sets | `/api/sets/public/route.ts` |
| `/v1/categories` | GET | List categories | `/api/sets/categories/route.ts` |
| `/v1/usage` | GET | Current period usage | New |

**Shared service extraction** (both internal + v1 routes call these):
- `/lib/services/flashcardGeneration.ts` -- from `/api/generate-flashcards/route.ts`
- `/lib/services/flashcardSets.ts` -- from set CRUD routes
- `/lib/services/pdfGeneration.ts` -- from PDF route
- `/lib/services/youtubeGeneration.ts` -- from YouTube route

---

## Phase 2: Billing + Developer Portal (Weeks 3-5)

### 2A. Stripe API Products

New Stripe price IDs (separate from consumer subscriptions):
- `STRIPE_API_DEVELOPER_PRICE_ID` ($19/mo)
- `STRIPE_API_PRO_PRICE_ID` ($49/mo)

**`/app/api/v1/billing/checkout/route.ts`** -- API-key-auth checkout sessions

Modify `/app/api/stripe/webhook/route.ts`:
- Handle API subscription events via `metadata.apiTier`
- New revenue event types: `api_subscription_created`, `api_upgraded`, `api_downgraded`, `api_canceled`

Overage billing via Stripe metered usage: `stripe.subscriptionItems.createUsageRecord()`

### 2B. Developer Portal (Session-Auth Pages)

**Route group: `/app/(dashboard)/developer/`**

| Page | Description |
|------|-------------|
| `/developer` | Dashboard overview -- keys, usage chart, quick links |
| `/developer/keys` | Create, revoke, rotate API keys |
| `/developer/usage` | Usage analytics with charts |
| `/developer/billing` | API subscription management |
| `/developer/docs` | Embedded API documentation |

**Internal API routes for the portal:**
- `/api/developer/keys` -- GET (list, filterable by `keyType`) / POST (create, requires `keyType` in body)
- `/api/developer/keys/[id]` -- DELETE (revoke) / PATCH (rename, update permissions)
- `/api/developer/keys/[id]/rotate` -- POST (rotate)
- `/api/developer/usage` -- GET current period stats (filterable by key)
- `/api/developer/usage/history` -- GET historical data for charts

**Key creation rules:**
| Key Type | Who Can Create | Max Keys |
|----------|---------------|----------|
| `admin` | Admin role only | 5 |
| `app` | Admin role only | 10 |
| `public` | Any user (Free=2, Dev=5, Pro=10, Enterprise=25) |  |
| `admin_public` | Admin role only | 5 |

Admin users see all key types in the developer portal. Regular users only see the `public` key section.

---

## Phase 3: Documentation + Polish (Weeks 5-7)

### 3A. OpenAPI Specification

Hand-written OpenAPI 3.1 spec served at `/api/v1/openapi.json`. Embedded docs UI using Scalar (modern Swagger alternative) at `/api/v1/docs`.

### 3B. Versioning Strategy
- `/api/v1/` prefix is the version boundary
- v1 supported for 12+ months after v2 launch
- `Sunset` header added during deprecation

### 3C. CORS
- Add CORS headers for `/api/v1/:path*` in `next.config.mjs`
- Or handle dynamically in `withApiAuth` wrapper

---

## Phase 4: Gemini Migration + Enterprise (Weeks 7-9)

### 4A. Gemini 2.0 -> 2.5 Migration (DEADLINE: June 1, 2026)

1. Make MODEL configurable via env var in `/lib/constants.js` (currently hardcoded)
2. Add `AI_MODEL_NAME` AppConfig entry
3. Test all generation types (topic, PDF, YouTube, image, audio) on 2.5 Flash
4. Gradual rollout via percentage-based config flag
5. Full cutover before June 1

Cost impact: 5.9x increase ($0.00045 -> $0.00265), but API pricing tiers already have healthy margins.

### 4B. Admin API Management Dashboard

**New page: `/app/(admin)/admin/api-management/page.tsx`**

Full admin control panel for API keys and usage across all key types:

**Sections:**
1. **Overview Cards** -- Total active keys (by type), total API calls (24h), total generations (24h), active Gemini keys status
2. **Key Management Table** -- All API keys across all types, filterable by type/status/user. Admin can:
   - Toggle keys on/off (active/revoked) with a switch
   - Change `apiTier` (Free/Developer/Pro/Enterprise) inline
   - Change rate limits per key (override defaults)
   - View usage stats per key
   - See which Gemini key each type is using
3. **Usage Charts** -- API calls over time (by key type), generation counts, top users, error rates
4. **Gemini Key Health** -- Status of each Gemini API key, cost estimates based on usage, toggle to disable a Gemini key (graceful fallback)
5. **Global Limits Config** -- Edit burst limits and monthly quotas per tier (saves to AppConfig, clears cache)

**API routes:**
- `GET /api/admin/api-keys` -- List all API keys (paginated, filterable)
- `PATCH /api/admin/api-keys/[id]` -- Toggle status, change tier, set custom limits
- `GET /api/admin/api-usage` -- Aggregated usage stats for dashboard
- `PUT /api/admin/api-config` -- Update API rate limit config (saves to AppConfig)

### 4C. Enterprise Features (Post-MVP)
- Webhook notifications for usage milestones
- IP allowlisting per API key
- Custom per-key rate limits
- Batch generation endpoint
- Priority support flag

---

## Files Summary

### New Files
```
/models/ApiKey.ts
/models/ApiUsage.ts
/models/ApiLog.ts
/lib/api/authenticateApiKey.ts
/lib/api/withApiAuth.ts
/lib/api/apiResponse.ts
/lib/api/apiErrors.ts
/lib/api/openapi.ts
/lib/ratelimit/rateLimitApi.ts
/lib/services/flashcardGeneration.ts
/lib/services/flashcardSets.ts
/lib/services/pdfGeneration.ts
/lib/services/youtubeGeneration.ts
/types/api.d.ts
/app/api/v1/generate/route.ts
/app/api/v1/generate/pdf/route.ts
/app/api/v1/generate/youtube/route.ts
/app/api/v1/sets/route.ts
/app/api/v1/sets/[id]/route.ts
/app/api/v1/sets/explore/route.ts
/app/api/v1/categories/route.ts
/app/api/v1/usage/route.ts
/app/api/v1/billing/checkout/route.ts
/app/api/v1/docs/route.ts
/app/api/v1/openapi.json/route.ts
/app/api/developer/keys/route.ts
/app/api/developer/keys/[id]/route.ts
/app/api/developer/keys/[id]/rotate/route.ts
/app/api/developer/usage/route.ts
/app/api/developer/usage/history/route.ts
/app/(dashboard)/developer/page.tsx
/app/(dashboard)/developer/keys/page.tsx
/app/(dashboard)/developer/usage/page.tsx
/app/(dashboard)/developer/billing/page.tsx
/app/(dashboard)/developer/docs/page.tsx
```

### Modified Files
```
/models/User.ts                    -- add apiTier field
/models/RevenueEvent.ts            -- add api_* event types
/app/api/stripe/webhook/route.ts   -- handle API subscription events
/lib/constants.js                  -- make Gemini MODEL configurable
/next.config.mjs                   -- add CORS headers for /api/v1/
```

---

## Verification Plan

### Key Type Isolation
1. **Admin key** (`fl_admin_`): Call `/api/admin/users` -> 200. Call `/api/v1/generate` -> 200. Verify unlimited rate.
2. **App key** (`fl_app_`): Call `/api/v1/sets` -> 200. Call `/api/admin/users` -> 403 (wrong key type). Verify burst limit at 300/min.
3. **Public key** (`fl_pub_`): Call `/api/v1/generate` -> 200. Call `/api/admin/users` -> 403. Verify tier-based rate limits.
4. **Admin Public key** (`fl_adm_pub_`): Call `/api/v1/generate` -> 200. Verify unlimited quota (no QUOTA_EXCEEDED even after 100+ calls).
5. **Cross-type rejection**: Use `fl_pub_` key on admin route -> 403. Use `fl_app_` key with non-admin user -> 401.

### Public API Flow
6. **API Key lifecycle**: Create `public` key -> verify `fl_pub_` prefix shown -> use key to call `/v1/usage` -> revoke key -> verify 401 on next call
7. **Rate limiting**: Hit `/v1/generate` 11 times in 1 minute on Free public key -> verify 429 on 11th request
8. **Monthly quota**: Exhaust 100 Free tier generations -> verify hard cap with `QUOTA_EXCEEDED` error
9. **Billing flow**: Upgrade to Developer via `/v1/billing/checkout` -> verify webhook updates `ApiKey.apiTier` -> verify new limits
10. **Generation**: POST to `/v1/generate` with `{ "topic": "World War 2", "count": 10 }` -> verify standard response envelope

### Infrastructure
11. **CORS**: `curl -H "Origin: https://example.com" /api/v1/categories` -> verify CORS headers
12. **Gemini migration**: Set `AI_MODEL_NAME=gemini-2.5-flash` -> generate flashcards -> verify quality comparable
13. **Admin portal**: Admin user sees all 4 key type tabs. Regular user sees only Public keys tab.
