# Marketing Idea 1: Social Hook Copy — Personalized Pre-Share Text

## Context
All three share surfaces use generic, passive copy: "Check out this flashcard set" or just a bare link with no pre-filled text (ChallengeShareModal). Personalizing the share copy to the user's actual achievement turns a neutral link into a challenge or brag — the psychological triggers that drive social engagement.

## What Changes

### 1. ShareModal — results-aware share text
**File:** `components/ShareModal.tsx`

The `shareText` prop already supports custom copy. The calling code in the generate page and results page just needs to pass better text:

**For shared results:**
Current: `"Check out this flashcard set"`
New: `"I scored {accuracy}% on {setName} — can you beat me?"`

**For shared sets:**
Current: `"Check out this flashcard set"`
New: `"Just studied {cardCount} cards on {setName}. Study it free:"`

Also update the **Twitter share URL** to include hashtags:
```ts
const twitterUrl = `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedText}&hashtags=flashcards,studywithme`;
```

### 2. ChallengeShareModal — add social sharing buttons
**File:** `components/versus/ChallengeShareModal.tsx`

Currently only has copy-link and copy-code. Add Twitter/X and iMessage-style share buttons with pre-filled copy:

```
"I challenged you to a flashcard battle on {setName} — can you beat me?
Join with code {code}: {url}  #FlashLearnAI #StudyChallenge"
```

Add a native **Web Share API** button (for mobile) as the primary action:
```ts
navigator.share({ title: 'Flashcard Challenge', text: shareText, url: challengeUrl })
```

### 3. StudySessionResults — share button improvements
**File:** `components/study/StudySessionResults.tsx`

When the "Share Results" button is clicked, pre-populate the share link with a message:
```
"Just aced {setName} with {accuracy}% accuracy on FlashLearn AI 🧠
Think you can do better? {shareUrl}"
```

Also: add a **"Challenge a Friend on This Set"** button that deep-links to `/versus/create?setId={listId}` — turns a personal result into a competitive invite.

### 4. Email share body
**File:** `components/ShareModal.tsx`

Update email body from the generic format to something that sells the app:
```
{userName} scored {accuracy}% on "{setName}" and wants to see if you can beat them.

Study this set free (no account needed):
{url}

Want to create your own AI flashcards? Try FlashLearn AI at flashlearn-ai.com
```

## Files Modified
- `components/ShareModal.tsx`
- `components/versus/ChallengeShareModal.tsx`
- `components/study/StudySessionResults.tsx`
- `app/(dashboard)/generate/page.tsx` — update shareText prop
- `app/results/[sessionId]/page.tsx` — update share trigger logic

## Pros
- Highest ROI: just copy changes, no new pages or APIs
- Every share becomes a mini-ad with a clear hook
- Web Share API on mobile shows the full system sheet (iMessage, WhatsApp, etc.)

## Cons
- Relies on users actually sharing; doesn't fix the landing experience for new visitors

## Verification
- Share a results link to Twitter and confirm the pre-filled text appears
- Test Web Share API on mobile (Android Chrome, iOS Safari)
- Confirm hashtags appear in the tweet
