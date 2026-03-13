# Marketing Idea 2: Viral Loop — Challenge Preview & Signup Gate

## Context
When someone without an account clicks a versus challenge link, they hit the auth middleware immediately and land on a generic sign-in page with no context about why they're signing up. They've lost the emotional hook from the share. This idea turns the versus link into a dedicated, auth-free preview page that builds desire before asking for an account — the "Wordle share" model.

## What Changes

### 1. Public challenge preview page
**New file:** `app/(public)/versus/preview/[code]/page.tsx`

A server-rendered, publicly accessible page at `/versus/preview/{code}` (no auth required).

Fetches the challenge by code (only public fields: set name, card count, participant count/scores, expiry) and shows:
```
┌──────────────────────────────────────────┐
│  ⚔️  You've been challenged!             │
│                                          │
│  "Organic Chemistry"                     │
│  20 cards · Multiple Choice              │
│                                          │
│  2 of 4 players have scored:             │
│  • Alex      94 pts  🥇                  │
│  • Jordan    71 pts                      │
│                                          │
│  ⏱ 6h 23m remaining                     │
│                                          │
│  [Accept Challenge →]  (→ signup)        │
│  [Study the Set First] (→ /sets/{id})    │
└──────────────────────────────────────────┘
```

The "Accept Challenge" CTA links to `/auth/signup?callbackUrl=/versus/join/{code}&ref=challenge` — returning them to the challenge immediately after signup.

### 2. Update ChallengeShareModal to use preview URL
**File:** `components/versus/ChallengeShareModal.tsx`

Change the share URL from:
```
/versus/join/{code}
```
to:
```
/versus/preview/{code}
```

The preview page is publicly viewable (good for SEO, good for conversion). The join page (which auto-joins) is still available directly at `/versus/join/{code}` for authenticated users.

### 3. Results page → "Start a Challenge" CTA
**File:** `app/results/[sessionId]/page.tsx`

When a non-owner views a shared results page, add a prominent CTA:

```
 ┌─────────────────────────────────────────┐
 │  Think you can do better?               │
 │  [Start a Challenge on This Set →]      │
 └─────────────────────────────────────────┘
```

Links to: `/versus/preview/create?setId={listId}` or `/auth/signup?ref=results_challenge`

For the set page, add the same thing below the Study button:
```
[⚔️ Challenge a Friend on This Set]  → /versus/create?setId={setId} (auth-gated)
```

### 4. Public study session → post-study signup prompt
**File:** `app/(public)/study/page.tsx`

After completing a public study session (all cards reviewed), show a banner:

```
 ✅ You scored 87%!
 Sign up free to save your progress, track streaks, and challenge friends.
 [Create Free Account →]
```

Uses `sessionStorage` to track study progress and show the prompt only after completion.

## Files Created
- `app/(public)/versus/preview/[code]/page.tsx` — new public challenge preview
- `app/(public)/versus/preview/[code]/layout.tsx` — metadata for the preview page

## Files Modified
- `components/versus/ChallengeShareModal.tsx` — share URL → preview URL
- `app/results/[sessionId]/page.tsx` — "Start a Challenge" CTA for non-owners
- `app/sets/[setId]/page.tsx` — "Challenge a Friend" CTA
- `app/(public)/study/page.tsx` — post-study signup prompt

## Pros
- Turns every challenge share into a conversion funnel
- Non-users see what they're missing before the auth wall
- Social proof (seeing other players' scores) increases motivation to join
- Low friction: "Study First" option lets visitors engage without immediately signing up

## Cons
- Need to decide what challenge data to expose publicly (participant names? scores?)
- More complex routing (preview vs join distinction)

## Verification
- Open a challenge preview URL in a private/incognito browser — should NOT redirect to signin
- Click "Accept Challenge" → should land on signup page → after signup → returns to `/versus/join/{code}`
- Verify scores/names are only shown if the challenge creator allows it
