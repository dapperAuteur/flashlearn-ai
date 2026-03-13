# Idea 1: Static Metadata & Open Graph Completeness

## Context
Shared links for versus challenges, study results, and public sets produce bare, undecorated previews when posted to social media — no rich card, no description, no image. This is a quick, zero-dependency fix that fills in the missing metadata at the route level using Next.js built-in conventions already partially used in the app.

## Approach: Fill in Metadata Gaps Across All Shared Routes

This approach touches only the metadata exports in existing page files. No new infrastructure, no new packages.

### 1. Root Layout — add `metadataBase`
**File:** `app/layout.tsx`

Add a `metadataBase` and default `openGraph` + `twitter` config so all child routes inherit a fallback:
```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://flashlearn-ai.com'),
  title: { default: 'FlashLearn AI', template: '%s | FlashLearn AI' },
  description: 'AI-powered flashcards and study challenges',
  openGraph: {
    siteName: 'FlashLearn AI',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    site: '@flashlearnaí',
  },
}
```

### 2. Versus Challenge Join Page
**File:** `app/(dashboard)/versus/join/[code]/page.tsx`

Add `generateMetadata` that fetches the challenge by code and returns:
- Title: `"{creatorName} challenged you to a flashcard battle!"`
- Description: `"Join {maxParticipants}-player challenge on {topic}. Use code {code} to enter."`
- OG type: `website`
- Twitter card: `summary`

### 3. Versus Challenge Results Page
**File:** `app/(dashboard)/versus/results/[challengeId]/page.tsx`

Add `generateMetadata`:
- Title: `"Versus Results: {topic}"`
- Description: `"See how {participants} players scored on this flashcard challenge."`

### 4. Sets Page — extend existing metadata
**File:** `app/sets/[setId]/page.tsx`

Already has `generateMetadata` with title and description. Extend it to include:
```ts
openGraph: {
  title,
  description,
  type: 'article',
  url: `/sets/${setId}`,
},
twitter: {
  card: 'summary',
  title,
  description,
},
```

### 5. Results Page — extend existing OG
**File:** `app/results/[sessionId]/page.tsx`

Already has partial OG. Add:
```ts
openGraph: {
  ...existing,
  url: `/results/${sessionId}`,
  type: 'article',
},
twitter: {
  card: 'summary',
  title: `${accuracy}% on ${setName}`,
  description: `${correctCount} of ${totalCards} correct`,
},
```

## Files Modified
- `app/layout.tsx`
- `app/(dashboard)/versus/join/[code]/page.tsx`
- `app/(dashboard)/versus/results/[challengeId]/page.tsx`
- `app/sets/[setId]/page.tsx`
- `app/results/[sessionId]/page.tsx`

## Pros
- Minimal effort, no new dependencies
- Works immediately on all platforms
- Uses patterns already in the codebase

## Cons
- Text-only previews (no image card) — links show as `summary` not `summary_large_image`
- Less visually distinctive on social media

## Verification
- Share a versus join link on Twitter/Slack and inspect with [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)
- Check OG tags with `curl -A Facebookbot <url> | grep og:`
- Use `opengraph.xyz` to preview all three URL types
