# Idea 2: Dynamic OG Images via Next.js `opengraph-image.tsx`

## Context
Social platforms (Twitter, iMessage, Slack, LinkedIn) show a large image card when a link has an `og:image`. Currently none of the shared routes produce one. Next.js App Router supports a file-based convention (`opengraph-image.tsx`) that auto-generates a PNG and wires the meta tag — no extra API route needed.

## Approach: Co-located OG Image Files Per Route

Add a `opengraph-image.tsx` file alongside each shared page. Each one uses `next/og` (`ImageResponse`) to render a branded, data-filled preview card at build time (static) or request time (dynamic).

No extra packages needed — `next/og` ships with Next.js 13.3+.

### Image Designs

#### A. Versus Challenge — `/versus/join/[code]/opengraph-image.tsx`
Renders a "battle card" style image:
```
┌─────────────────────────────────────┐
│  ⚔️  FlashLearn Versus              │
│                                     │
│  "{topic}"                          │
│  Up to {maxParticipants} players    │
│                                     │
│  Use code: XXXXXX                   │
│  → flashlearn-ai.com                │
└─────────────────────────────────────┘
```
Fetches challenge by code, returns `ImageResponse` with brand colors.

#### B. Study Results — `/results/[sessionId]/opengraph-image.tsx`
Renders a results summary card:
```
┌─────────────────────────────────────┐
│  FlashLearn AI · Study Results      │
│                                     │
│  "{set name}"                       │
│                                     │
│       87%                           │
│  13 / 15 correct                    │
│  Completed in 4m 32s                │
└─────────────────────────────────────┘
```

#### C. Public Set — `/sets/[setId]/opengraph-image.tsx`
Renders a set preview card:
```
┌─────────────────────────────────────┐
│  FlashLearn AI                      │
│                                     │
│  "{set title}"                      │
│  {cardCount} flashcards             │
│                                     │
│  Study this set →                   │
└─────────────────────────────────────┘
```

### Metadata Updates (companion to images)
Update `generateMetadata` in each page to set `twitter.card: 'summary_large_image'` so platforms use the large image format.

### Shared Helper
Create `lib/og/styles.ts` to export shared brand colors, font config, and layout constants used across all three image files.

## Files Created
- `app/(dashboard)/versus/join/[code]/opengraph-image.tsx`
- `app/(dashboard)/versus/results/[challengeId]/opengraph-image.tsx`
- `app/results/[sessionId]/opengraph-image.tsx`
- `app/sets/[setId]/opengraph-image.tsx`
- `lib/og/styles.ts` (shared constants)

## Files Modified
- `app/(dashboard)/versus/join/[code]/page.tsx` — add/update `generateMetadata`
- `app/(dashboard)/versus/results/[challengeId]/page.tsx` — add `generateMetadata`
- `app/results/[sessionId]/page.tsx` — update twitter card type
- `app/sets/[setId]/page.tsx` — update twitter card type
- `app/layout.tsx` — add `metadataBase`

## Pros
- Large image previews on Twitter, iMessage, Slack — much more eye-catching
- No new dependencies or API routes
- Images are generated at request-time with live data
- Next.js handles `og:image` URL wiring automatically

## Cons
- More code than Idea 1
- Image routes add a small rendering cost per share click (cacheable via CDN)
- Need to ensure DB access works in the image route's edge/node context

## Verification
- Visit `<url>/opengraph-image` directly in browser to preview each image
- Validate with [opengraph.xyz](https://www.opengraph.xyz) and Twitter Card Validator
- Check `<meta property="og:image">` in page source
