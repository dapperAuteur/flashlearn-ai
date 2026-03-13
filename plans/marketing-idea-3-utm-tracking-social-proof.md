# Marketing Idea 3: UTM Attribution + Social Proof Counters

## Context
There is currently no way to know which shared links are actually driving signups. UTM parameters appended to every share URL would let analytics (Vercel Analytics is already installed) attribute signups to specific share campaigns. Social proof counters on shared pages ("47 people have studied this set") add credibility and urgency that nudge visitors to act.

## What Changes

### Part A: UTM Parameters on All Share URLs

#### 1. Share URL builder utility
**New file:** `lib/share-urls.ts`

A single helper that appends UTM params to any URL:
```ts
export function buildShareUrl(path: string, source: 'twitter' | 'facebook' | 'email' | 'copy' | 'native', campaign: 'versus' | 'results' | 'set') {
  const url = new URL(path, 'https://www.flashlearn-ai.com');
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}
```

#### 2. Wire into all share modals
- **ShareModal.tsx** — pass `buildShareUrl(shareUrl, source, 'set')` to each platform button
- **ChallengeShareModal.tsx** — `buildShareUrl(challengeUrl, 'copy', 'versus')` for the copied link
- **ShareableResultsCard.tsx** — `buildShareUrl(shareUrl, 'native', 'results')` for the Web Share API

#### 3. Capture UTM params in signup flow
**File:** `app/(auth)/auth/signup/page.tsx` (and signin)

On page load, read UTM params from the URL and store in `sessionStorage`:
```ts
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const utm = { source: params.get('utm_source'), medium: params.get('utm_medium'), campaign: params.get('utm_campaign') };
  if (utm.source) sessionStorage.setItem('utm', JSON.stringify(utm));
}, []);
```

On successful signup, include the UTM data in the user creation payload so it can be stored on the user record — enabling lifetime attribution ("this user came from a versus share on Twitter").

---

### Part B: Social Proof Counters on Shared Pages

#### 1. Study count on set pages
**File:** `app/sets/[setId]/page.tsx`

Show a live counter: "Studied by {n} people" below the card count.

Add a `studyCount` field to the `FlashcardSet` model (incremented when `/study` is loaded with `?setId=`), or derive it from a count query on StudySessions:
```ts
const studyCount = await StudySession.countDocuments({ listId: setId });
```

Display as: `"Studied {studyCount} times"` (threshold: only show if > 5 to avoid showing 0).

#### 2. Participant count on challenge preview
**File:** `app/(public)/versus/preview/[code]/page.tsx` (from Idea 2)

Already planned to show participant list — the count itself IS the social proof.

#### 3. Shareable results page — "Join X others who studied this"
**File:** `app/results/[sessionId]/page.tsx`

Show below the results: `"Join {studyCount} others who have studied this set"` with a CTA to sign up. Only shown to non-owners.

---

### Part C: "Shared by" Attribution on Landing Pages

When a user clicks a shared link and creates an account, show a personalized message on the dashboard:

> "You joined because {sharerName} challenged you — rematch them?"

This creates a social bond that increases early retention. Implementation:
- Store `ref={userId}` on the share URL (optional, user-controlled)
- On signup, save the referrer user ID to the new user's record
- On first dashboard load, show the welcome message if `referrerId` is set

## Files Created
- `lib/share-urls.ts` — UTM URL builder

## Files Modified
- `components/ShareModal.tsx` — use `buildShareUrl`
- `components/versus/ChallengeShareModal.tsx` — use `buildShareUrl`
- `components/study/ShareableResultsCard.tsx` — use `buildShareUrl`
- `app/(auth)/auth/signup/page.tsx` — capture UTM on load, send on submit
- `app/sets/[setId]/page.tsx` — studyCount social proof
- `app/results/[sessionId]/page.tsx` — "Join X others" CTA

## Pros
- UTM tracking is zero-friction for users but high-value for the team
- Social proof increases conversion on the shared pages themselves
- Referral attribution enables personalized onboarding ("You were challenged by…")
- Builds a data foundation to know which share surfaces are performing

## Cons
- UTM params make URLs slightly longer (not a real issue)
- `studyCount` query adds a DB call per page load (can be cached or approximated)
- Referral system requires user consent if privacy-sensitive (just a count is fine; showing names requires opting in)

## Verification
- Share a versus link via Twitter → click it from a new browser → sign up → check that UTM data was captured in the user record
- Open `/sets/{id}` with `?utm_source=twitter` and confirm UTM is preserved through signup
- Verify study count shows on set pages after at least 5 study sessions exist
