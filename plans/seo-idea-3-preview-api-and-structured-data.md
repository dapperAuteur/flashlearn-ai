# Idea 3: Centralized Preview API + Structured Data (JSON-LD)

## Context
Beyond social cards, SEO also benefits from structured data that lets search engines understand page content, and from a single, maintainable image generation service rather than per-route files. This idea combines both into a "social layer" that serves all three share surfaces from one place.

## Approach: `/api/og` Endpoint + JSON-LD Schema on Pages

### Part A: Centralized OG Image API — `app/api/og/route.ts`

A single route handles all image types via query params:
```
/api/og?type=versus&code=ABC123
/api/og?type=results&id=<sessionId>
/api/og?type=set&id=<setId>
```

Uses `next/og` (`ImageResponse`) with a `switch` on `type`. All brand styling lives in one file. Each type fetches its own data.

Benefits over Idea 2:
- One file to maintain instead of four
- Easier to A/B test designs or add new share types later
- Can be called from anywhere (e.g. email templates, admin previews)

Each page's `generateMetadata` references this endpoint:
```ts
openGraph: {
  images: [`/api/og?type=versus&code=${code}`],
}
```

### Part B: JSON-LD Structured Data

Add a `<script type="application/ld+json">` block to each shared page for richer Google/Bing search results and link previews.

#### Versus Challenge → `Event` or `Game` schema
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Flashcard Challenge: {topic}",
  "description": "Multiplayer flashcard challenge with up to {n} players",
  "url": "https://flashlearn-ai.com/versus/join/{code}"
}
```

#### Study Results → `Article` or `Quiz` schema
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{accuracy}% on {setName}",
  "description": "{correct} of {total} cards correct"
}
```

#### Public Set → `Course` or `EducationalOccupationalCredential` schema
```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "{title}",
  "description": "{description}",
  "numberOfCredits": "{cardCount} flashcards"
}
```

#### Implementation
Create a `lib/structured-data.ts` helper that returns typed JSON-LD objects, and render them in each page:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

### Part C: `metadataBase` + canonical URLs
- Add `metadataBase` to `app/layout.tsx`
- Add `alternates.canonical` to each shared page's metadata to prevent duplicate content issues

## Files Created
- `app/api/og/route.ts` — centralized image generation
- `lib/og/templates.tsx` — JSX templates for each image type
- `lib/structured-data.ts` — JSON-LD builder helpers

## Files Modified
- `app/layout.tsx` — `metadataBase`, default OG/Twitter config
- `app/(dashboard)/versus/join/[code]/page.tsx` — metadata + JSON-LD
- `app/(dashboard)/versus/results/[challengeId]/page.tsx` — metadata + JSON-LD
- `app/results/[sessionId]/page.tsx` — extend metadata, add JSON-LD
- `app/sets/[setId]/page.tsx` — extend metadata, add JSON-LD

## Pros
- Single source of truth for all OG images
- JSON-LD improves Google rich results and search appearance
- Most scalable — adding a new share type is just a new `case` in the route
- Canonical URLs prevent SEO penalties for duplicate content

## Cons
- Most complex of the three ideas
- JSON-LD requires keeping schema types current
- Centralized route means one failure point for all previews

## Verification
- Test `/api/og?type=versus&code=TEST` directly in browser
- Use Google's Rich Results Test on each shared URL
- Validate OG tags with `opengraph.xyz`
- Check Twitter Card Validator for `summary_large_image` rendering
- Inspect `<script type="application/ld+json">` in page source
