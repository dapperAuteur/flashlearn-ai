# Plan: Fix "Share Results" Showing "Share This Set" Label

## Context

When a user finishes a study session and clicks "Share Results", the `ShareModal` pops up but its heading reads **"Share This Set"** and the social sharing links say **"Check out this flashcard set"** — even though the URL being shared (`/results/{sessionId}`) correctly points to the study session results page, not the flashcard set. This confuses users into thinking they're sharing the set rather than their performance results.

The underlying share URL and the results page (`app/results/[sessionId]/page.tsx`) are working correctly. Only the labels in `ShareModal` are wrong.

---

## Root Cause

`components/ShareModal.tsx` hardcodes two strings:
- Line 61: `<h2>Share This Set</h2>`
- Line 50: `` `Check out this flashcard set: ${title}` `` (used in Twitter + email share text)
- Line 85: `"Check out this flashcard set I made on Flashlearn AI"` (email body fallback)

`ShareModal` already accepts a `title` prop (the accuracy + set name string passed from `StudySessionResults`), but the *heading* is not driven by a prop.

---

## Critical Files

| File | Change |
|------|--------|
| `components/ShareModal.tsx` | Add optional `heading` prop; update social share text |
| `components/study/StudySessionResults.tsx` | Pass `heading="Share Your Results"` to ShareModal |

---

## Implementation

### Step 1 — `components/ShareModal.tsx`

Add optional `heading` prop (defaults to `"Share This Set"` for backward compatibility):

```typescript
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  heading?: string;           // new — default: "Share This Set"
  shareText?: string;         // new — default: "Check out this flashcard set"
}
```

Replace the hardcoded heading (line 61):
```tsx
// Before
<h2 ...>Share This Set</h2>

// After
<h2 ...>{heading ?? 'Share This Set'}</h2>
```

Replace the hardcoded social share text (line 50):
```typescript
// Before
const encodedTitle = encodeURIComponent(`Check out this flashcard set: ${title}`);

// After
const shareTextPrefix = shareText ?? 'Check out this flashcard set';
const encodedTitle = encodeURIComponent(`${shareTextPrefix}: ${title}`);
```

Replace the email body text (line 85):
```tsx
// Before
href={`mailto:?subject=${encodedTitle}&body=Check out this flashcard set I made on Flashlearn AI: ${encodedUrl}`}

// After
href={`mailto:?subject=${encodedTitle}&body=${shareTextPrefix} on Flashlearn AI: ${encodedUrl}`}
```

### Step 2 — `components/study/StudySessionResults.tsx`

Pass the correct heading when calling `ShareModal` (around line 343):

```tsx
// Before
<ShareModal
  isOpen={shareModalOpen}
  onClose={() => setShareModalOpen(false)}
  shareUrl={shareUrl || ''}
  title={`${results.accuracy.toFixed(0)}% on ${flashcardSetName}`}
/>

// After
<ShareModal
  isOpen={shareModalOpen}
  onClose={() => setShareModalOpen(false)}
  shareUrl={shareUrl || ''}
  title={`${results.accuracy.toFixed(0)}% on ${flashcardSetName}`}
  heading="Share Your Results"
  shareText="Check out my study results"
/>
```

---

## Verification

1. Finish a study session → click "Share Results" → modal heading should read **"Share Your Results"**
2. Copy the URL and paste in a new tab → should open `/results/{sessionId}` showing session stats and card-by-card breakdown (not the flashcard set)
3. Check Twitter/email share links → text should say "Check out my study results" not "Check out this flashcard set"
4. Any other place `ShareModal` is used (flashcard set sharing) should still show "Share This Set" — confirm default behavior is unchanged
