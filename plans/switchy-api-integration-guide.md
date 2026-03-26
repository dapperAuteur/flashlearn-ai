# Switchy.io API Integration Guide

Reference for integrating Switchy.io tracked short links into any app. Based on the working implementation in CentenarianOS (`lib/switchy.ts`).

---

## API Basics

| | |
|---|---|
| **Base URL** | `https://api.switchy.io/v1` |
| **Auth Header** | `Api-Authorization: <your-token>` (NOT `Authorization: Bearer`) |
| **Content-Type** | `application/json` |
| **Docs** | https://developers.switchy.io |
| **Rate Limits** | 10,000 links/day, 1,000 links/hour |

### Get Your API Token

Switchy dashboard → Settings → Integrations → API token (per-workspace).

---

## Environment Variables

```env
SWITCHY_API_TOKEN=your_api_token_here
SWITCHY_DOMAIN=i.centenarianos.com        # optional, defaults to hi.switchy.io
SWITCHY_PIXEL_IDS=id1,id2,id3             # optional, comma-separated Switchy pixel IDs
```

- `SWITCHY_API_TOKEN` — required. Without it, all calls silently return null/false.
- `SWITCHY_DOMAIN` — your custom short link domain. Must be configured in Switchy dashboard first.
- `SWITCHY_PIXEL_IDS` — attach marketing pixels (Facebook, GA, TikTok, Twitter) to every link.

---

## Endpoints

### 1. Create a Short Link

```
POST https://api.switchy.io/v1/links/create
```

**Request body** (everything is nested inside a `link` object):

```json
{
  "link": {
    "url": "https://yoursite.com/blog/my-post",
    "domain": "i.centenarianos.com",
    "id": "b-my-post",
    "title": "My Blog Post",
    "description": "A short description for OG previews",
    "image": "https://yoursite.com/og/my-post.jpg",
    "tags": ["blog"],
    "pixels": ["pixel-uuid-1", "pixel-uuid-2"]
  }
}
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `url` | Yes | Destination URL (must include `https://`) |
| `domain` | No | Custom domain (default: `hi.switchy.io`). Restricted domains: `hi.switchy.io`, `swiy.io` |
| `id` | No | Custom slug (default: random). This becomes the path: `domain/id` |
| `title` | No | OG title for social previews |
| `description` | No | OG description |
| `image` | No | OG image URL |
| `tags` | No | Array of tag strings for organization |
| `pixels` | No | Array of Switchy pixel UUIDs to attach |
| `folderId` | No | Organize into a Switchy folder |
| `showGDPR` | No | Show GDPR consent banner (default: false) |
| `passwordProtect` | No | Require password to access |
| `linkExpiration` | No | Auto-expire the link |

**Response** (shape varies — use defensive parsing):

```json
{
  "link": {
    "id": "b-my-post",
    "short_url": "https://i.centenarianos.com/b-my-post",
    ...
  }
}
```

**Error codes:**
- `409` or `422` — slug already taken. Retry with a random suffix.
- `400` — invalid URL (must include protocol `https://`).
- `401` — bad or missing API token.

### 2. Update an Existing Link

```
PUT https://api.switchy.io/v1/links/{linkId}
```

**Request body:**

```json
{
  "link": {
    "url": "https://yoursite.com/blog/updated-post",
    "title": "Updated Title",
    "description": "Updated description",
    "image": "https://yoursite.com/og/updated.jpg",
    "pixels": ["pixel-uuid-1", "pixel-uuid-2"]
  }
}
```

All fields are optional — only include what changed. Returns `200` on success.

### 3. Update by Domain + Slug (alternative)

```
PUT https://api.switchy.io/v1/links/by-domain/:domain/:id
```

Same body as above. Useful when you don't have the Switchy internal link ID but know the domain and slug.

---

## Gotchas We Learned the Hard Way

### 1. Body MUST be wrapped in `{ link: { ... } }`

The create and update endpoints both expect the data nested inside a `link` key. Sending fields at the top level returns a silent failure or 400.

```js
// WRONG
body: JSON.stringify({ url, domain, id, title })

// CORRECT
body: JSON.stringify({ link: { url, domain, id, title } })
```

### 2. URL must include `https://`

Switchy validates the destination URL. If your env var is `NEXT_PUBLIC_APP_URL=mysite.com` (no protocol), the resulting URL `mysite.com/blog/post` will be rejected with `406 Url is not valid`.

Always normalize:
```ts
const rawUrl = process.env.NEXT_PUBLIC_APP_URL || '';
const siteUrl = rawUrl
  ? `https://${rawUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  : '';
```

### 3. Slug collisions return 409/422

If the slug is already taken, Switchy returns 409 or 422. Handle by retrying with a random suffix:

```ts
if (res.status === 409 || res.status === 422) {
  const suffix = Math.random().toString(36).slice(2, 8);
  // Retry with: { link: { ...link, id: `${slug}-${suffix}` } }
}
```

### 4. Response shape is inconsistent

The response may return the link nested under `{ link: { ... } }` or flat at the root. The `short_url` field may be `short_url`, `shortUrl`, or absent entirely (construct from `domain + id`).

Use defensive parsing:
```ts
const data = (json.link ?? json);
const id = data.id ?? data._id ?? '';
const short_url = data.short_url ?? data.shortUrl ?? `https://${domain}/${id}`;
```

### 5. No list/read endpoints

The API only has `create` and `update`. There's no `GET /links` or `GET /pixels`. To list your pixels, use the GraphQL endpoint from the web dashboard (see below).

### 6. Fire and forget

Switchy outages should never block your app's publish flow. Call `createShortLink()` with `.then().catch()` and handle null returns gracefully. Share bars should fall back to the full URL when no short link exists.

---

## Getting Pixel IDs

Pixels are configured in the Switchy web UI (Settings → Pixels). Each pixel gets a UUID. The API has no endpoint to list them, but you can extract them from the web dashboard's GraphQL API:

**Endpoint:** `https://direct.graphql.switchy.io/v1/graphql`

The web dashboard makes this call when loading the pixels page. Capture it via browser DevTools (Network tab) or from a HAR export. The response looks like:

```json
{
  "data": {
    "pixels": [
      {
        "id": "a156e943-7a54-4317-91c6-b8ecad427509",
        "platform": "facebook",
        "title": "My FB Pixel",
        "value": "982656029114112"
      },
      {
        "id": "fa695cfd-8e6d-4672-8d11-1d91600bfda8",
        "platform": "ga",
        "title": "My GA Property",
        "value": "G-XXXXXXXXXX"
      }
    ]
  }
}
```

The `id` field (UUID) is what goes in `SWITCHY_PIXEL_IDS`. The `value` is the raw platform pixel ID (for reference only).

---

## Slug Conventions

Use a content-type prefix so you can identify links at a glance:

| Prefix | Content Type |
|--------|-------------|
| `b-` | Blog posts |
| `r-` | Recipes |
| `c-` | Courses |
| `f-` | Feature pages |
| `i-` | Institutions |
| `o-` | Other |

Slug generation:
```ts
function toSwitchySlug(prefix: string, text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${prefix}-${slug}`;
}
```

---

## Database Pattern

Add these columns to any content table that gets short links:

```sql
ALTER TABLE your_table
  ADD COLUMN IF NOT EXISTS short_link_id TEXT,
  ADD COLUMN IF NOT EXISTS short_link_url TEXT;
```

- `short_link_id` — the Switchy link ID (used for updates)
- `short_link_url` — the full short URL (used in share bars)

---

## Integration Pattern (Next.js)

### On publish (fire-and-forget):

```ts
// In your PATCH route, after setting is_published = true:
if (isNowPublishing && !existing.short_link_id) {
  createShortLink({
    url: `${siteUrl}/blog/${username}/${slug}`,
    slug: toSwitchySlug('b', slug),
    title,
    description: excerpt,
    image: cover_image_url,
    tags: ['blog'],
  }).then(async (link) => {
    if (link) {
      await db.from('blog_posts')
        .update({ short_link_id: link.id, short_link_url: link.short_url })
        .eq('id', id);
    }
  }).catch(() => { /* non-critical */ });
}
```

### On metadata edit (fire-and-forget):

```ts
if (existing.short_link_id && (titleChanged || imageChanged)) {
  updateShortLink({
    linkId: existing.short_link_id,
    title: newTitle,
    description: newExcerpt,
    image: newCoverUrl,
  }).catch(() => {});
}
```

### In share bars (fallback to full URL):

```ts
const shareUrl = post.short_link_url ?? `${siteUrl}/blog/${username}/${slug}`;
```

---

## Admin Backfill

For content published before Switchy was integrated, create a sync endpoint that:

1. Queries all published content where `short_link_id IS NULL`
2. Calls `createShortLink()` for each
3. Updates the DB with the returned `id` and `short_url`
4. Rate-limits with `await delay(100)` between calls

For adding pixels to existing links, query all content where `short_link_id IS NOT NULL` and call `updateShortLink({ linkId })` on each — the pixel IDs come from the env var automatically.

---

## Reference Implementation

Full working code: `lib/switchy.ts` in the CentenarianOS repo. Copy this file into any Next.js app and set the three env vars.
