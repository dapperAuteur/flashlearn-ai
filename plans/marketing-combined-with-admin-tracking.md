# Combined Marketing Plan: Share Link Optimization + Admin Attribution Dashboard

## Context
Shared links for versus challenges, study results, and public sets are the app's primary viral loop. Currently: share copy is generic, non-users hitting challenge links land on a blank sign-in page with no context, there is no UTM tracking, and the admin has no visibility into which shares drive signups or revenue. This plan combines all three marketing ideas and layers a full attribution dashboard on top.

---

## Phase 1 — Social Hook Copy (Idea 1)

**Goal:** Make every shared link a personalized "brag + challenge" that compels clicks.

### 1a. `lib/share-urls.ts` — UTM URL builder (new file)
```ts
export function buildShareUrl(path, source, campaign) {
  // appends utm_source, utm_medium=share, utm_campaign to every URL
}
```

### 1b. `components/ShareModal.tsx`
- Pre-fill Twitter/email with score-aware copy: `"I scored {accuracy}% on {setName} — can you beat me?"`
- Add `#flashcards #studywithme` hashtags to Twitter intent URL
- Wire all platform buttons through `buildShareUrl()`

### 1c. `components/versus/ChallengeShareModal.tsx`
- Add **Web Share API** as the primary action (shows iOS/Android native share sheet)
- Pre-fill copy: `"I challenged you to a flashcard battle on {setName}. Use code {code} or join here: {url}"`
- Wire copy button and platform buttons through `buildShareUrl(url, 'copy'/'twitter', 'versus')`
- Change share URL to `/versus/preview/{code}` (see Phase 2)

### 1d. `components/study/StudySessionResults.tsx`
- Add **"Challenge a Friend on This Set"** button → `/versus/create?setId={listId}`
- Update share text passed to ShareModal to include accuracy score

### 1e. `app/results/[sessionId]/page.tsx`
- Non-owner CTA: replace plain text link with a styled button: `"Think you can do better? → Start a Challenge"`

---

## Phase 2 — Viral Loop: Public Challenge Preview (Idea 2)

**Goal:** Let non-users see what they're getting into before hitting the auth wall.

### 2a. `app/(public)/versus/preview/[code]/page.tsx` (new — server component)
Publicly accessible at `/versus/preview/{code}`. Fetches: `setName`, `cardCount`, `participants[].{userName, compositeScore, rank}`, `expiresAt`, `maxParticipants`, `status`.

Renders:
- Challenge details (set, mode, card count)
- Live leaderboard (scores of completed participants)
- Countdown timer ("5h 42m remaining")
- Primary CTA: **"Accept Challenge →"** → `/auth/signup?callbackUrl=/versus/join/{code}&utm_source=challenge_preview&utm_campaign=versus`
- Secondary CTA: **"Study the Set First"** → `/sets/{flashcardSetId}` (if public) or `/study?setId={id}`

### 2b. `app/(public)/versus/preview/[code]/layout.tsx` (new)
- `generateMetadata` using the same challenge data (extends the OG image work already done)

### 2c. `app/(public)/study/page.tsx`
- After all cards reviewed, show post-study prompt: `"Sign up free to save your progress and challenge friends"` with a "Create Free Account" CTA → `/auth/signup?utm_source=post_study&utm_campaign=set`

### 2d. `app/sets/[setId]/page.tsx`
- Add **"⚔️ Challenge a Friend"** button next to "Study This Set" → `/versus/create?setId={setId}` (auth-gated, shows sign-in if needed)

---

## Phase 3 — UTM Capture & Social Proof (Idea 3)

### 3a. Extend User model (`models/User.ts`)
Add optional fields:
```ts
signupSource: String  // 'versus' | 'results' | 'set' | 'direct' | 'admin_invite'
utmSource: String     // 'twitter' | 'facebook' | 'email' | 'copy' | 'native'
utmMedium: String     // always 'share'
utmCampaign: String   // 'versus' | 'results' | 'set' | 'challenge_preview'
referredBy: ObjectId  // userId of the person whose link they clicked (if ref= present)
```

### 3b. UTM capture in signup flow (`app/(auth)/auth/signup/page.tsx`)
On mount, read UTM params from the URL (passed through the `callbackUrl` encoding) and persist to `sessionStorage`. On successful signup, send UTM fields in the user creation API call.

### 3c. Social proof counters
- `app/sets/[setId]/page.tsx`: show `"Studied {n} times"` (count from StudySessions where listId = setId; only show if ≥ 10)
- `app/(public)/versus/preview/[code]/page.tsx`: participant list IS the social proof

---

## Phase 4 — Admin: Share Attribution Dashboard

**Goal:** Give the admin visibility into which share surfaces drive signups and conversions.

### 4a. New model: `models/ShareEvent.ts`
```ts
{
  type: 'versus' | 'results' | 'set'     // what was shared
  resourceId: String                      // challenge code, sessionId, or setId
  utmSource: String                       // which platform
  utmCampaign: String
  clickedAt: Date
  convertedUserId: ObjectId | null        // set after signup
  convertedAt: Date | null
}
```
A ShareEvent is created when a shared public page is loaded (server-side, in the page component). On signup, the most recent unconverted ShareEvent from the same session is linked via `convertedUserId`.

### 4b. New API: `app/api/admin/analytics/shares/route.ts`
Returns aggregated share stats for the admin dashboard:
```ts
{
  totalShares: { versus: n, results: n, set: n }   // by type, last 30d
  totalClicks: { versus: n, results: n, set: n }
  conversions: { versus: n, results: n, set: n }   // clicks → signups
  conversionRate: number                           // %
  topChallenges: [{ code, setName, clicks, conversions }]
  utmBreakdown: [{ source, clicks, conversions }]  // twitter vs copy vs email
  timelineData: [{ date, clicks, conversions }]    // 30-day chart
}
```

### 4c. New admin page: `app/(admin)/admin/shares/page.tsx`
Extends the existing admin panel pattern. Shows:
- **Summary cards**: Total share links clicked, Total signups from shares, Share-to-signup conversion rate, Top platform (Twitter/Copy/Email)
- **Chart**: Share clicks vs. signups over time (30-day line chart, same pattern as existing admin charts)
- **Table**: Top performing challenge codes (code, set name, # clicks, # joined, # converted to account)
- **UTM breakdown table**: Platform → clicks → signups → % conversion
- **Funnel**: Share clicked → Preview viewed → Signup started → Signup completed

### 4d. Custom Vercel Analytics events (`track()`)
Fire these throughout the app:
```ts
import { track } from '@vercel/analytics';

// When a share link is copied/clicked
track('share_generated', { type: 'versus' | 'results' | 'set', platform: 'twitter' | 'copy' | ... });

// When the public challenge preview page loads
track('challenge_preview_viewed', { code, hasCompletedPlayers: boolean });

// When "Accept Challenge" CTA is clicked on preview
track('challenge_accepted_cta', { code });

// On signup completion where UTM is present
track('signup_from_share', { utmCampaign, utmSource });
```
These appear in the existing Vercel Analytics dashboard automatically.

### 4e. Add "Shares" link to admin nav
**File:** `app/(admin)/admin/layout.tsx` — add "Shares & Referrals" to the sidebar nav.

---

## Complete File List

### New Files
- `lib/share-urls.ts`
- `lib/models/ShareEvent.ts`
- `app/(public)/versus/preview/[code]/page.tsx`
- `app/(public)/versus/preview/[code]/layout.tsx`
- `app/api/admin/analytics/shares/route.ts`
- `app/(admin)/admin/shares/page.tsx`

### Modified Files
- `models/User.ts` — add UTM + referral fields
- `components/ShareModal.tsx` — personalized copy + UTM URLs
- `components/versus/ChallengeShareModal.tsx` — Web Share API + UTM + preview URL
- `components/study/StudySessionResults.tsx` — "Challenge a Friend" CTA
- `app/(auth)/auth/signup/page.tsx` — capture UTM from session, send on submit
- `app/api/auth/signup/route.ts` (or wherever user creation happens) — save UTM fields to User
- `app/sets/[setId]/page.tsx` — "Challenge a Friend" button + study count
- `app/results/[sessionId]/page.tsx` — stronger non-owner CTA
- `app/(public)/study/page.tsx` — post-study signup prompt
- `app/(admin)/admin/layout.tsx` — add Shares nav link

---

## Admin Impact at a Glance
The admin will be able to answer:
- "Which platform (Twitter, email, copy) drives the most signups from shares?"
- "Which versus challenges went viral and converted the most new users?"
- "What is our share-to-signup conversion rate this week vs. last week?"
- "Did the copy changes in Idea 1 increase conversion rate?"

---

## Verification
1. Share a challenge link on mobile → confirm native share sheet opens with pre-filled text
2. Open the challenge link in incognito → lands on `/versus/preview/{code}` (not sign-in)
3. Click "Accept Challenge" → signup page with UTM params in URL
4. Complete signup → check User record has `signupSource: 'versus'` and `utmSource` set
5. Visit `/admin/shares` → confirm charts populate with the test click + conversion
6. Fire `track()` events and verify they appear in Vercel Analytics dashboard
