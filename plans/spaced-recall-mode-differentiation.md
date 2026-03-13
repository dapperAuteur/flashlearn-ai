# Plan: Per-Mode Spaced Recall & Study Style Differentiation

## Context

Currently, flashlearn-ai tracks a single SM-2 dataset per card (`cardPerformance[].mlData`) regardless of how the card was studied. A user who knows a card front-to-back but struggles back-to-front gets a combined SM-2 score that doesn't reflect their true weakness. Additionally, the app stores `studyMode` (classic / multiple-choice) and `studyDirection` (front-to-back / back-to-front) in the session context and on `StudySession`, but never uses them to differentiate analytics or spaced recall scheduling. The goal is to make spaced recall mode-aware, surface per-mode weak spots, and nudge users to try directions/modes they've been avoiding.

---

## Approach

Track SM-2 and accuracy **per (mode × direction) combination** in a `modePerformance` sub-array on each card's performance record. After sessions, show the user a mode-breakdown insight with targeted nudges to try untested or weaker modes.

---

## Critical Files

| File | Change |
|------|--------|
| `models/StudyAnalytics.ts` | Add `modePerformance[]` to card performance schema |
| `models/StudySession.ts` | Add `studyMode` field |
| `models/CardResult.ts` | Add `studyMode` + `studyDirection` fields |
| `lib/db/indexeddb.ts` | Add `studyMode` to `StudySessionHistory` interface |
| `app/api/study/sessions/route.ts` | Update sync to write per-mode SM-2; accept `studyMode` on create |
| `lib/services/syncService.ts` | Include `studyMode` in sync payload |
| `contexts/StudySessionContext.tsx` | Include `studyMode` in `sessionMeta` when saving history |
| `app/api/study/analytics/route.ts` | Add per-mode `problemCards` breakdown |
| `app/api/study/due-cards/route.ts` | Use per-mode `nextReviewDate` when scheduling |
| `components/study/StudySessionResults.tsx` | Add mode-insight panel + "try other modes" nudge |

---

## Step-by-Step Implementation

### Step 1 — Data Models

**`models/StudyAnalytics.ts`**

Add a `ModePerformanceSchema` embedded in each `cardPerformance` entry:

```typescript
const ModePerformanceSchema = new mongoose.Schema({
  mode:      { type: String, enum: ['classic', 'multiple-choice', 'type-answer'], required: true },
  direction: { type: String, enum: ['front-to-back', 'back-to-front'], required: true },
  correctCount:   { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  mlData: MlDataSchema,
});
```

Add to `cardPerformance` array items:
```typescript
modePerformance: [ModePerformanceSchema]
```

**`models/StudySession.ts`**

Add field:
```typescript
studyMode: { type: String, enum: ['classic', 'multiple-choice', 'type-answer'], default: 'classic' }
```

**`models/CardResult.ts`**

Add fields:
```typescript
studyMode:      { type: String, enum: ['classic', 'multiple-choice', 'type-answer'] },
studyDirection: { type: String, enum: ['front-to-back', 'back-to-front'] }
```

**`lib/db/indexeddb.ts`**

Add `studyMode: string` to the `StudySessionHistory` interface (line ~71).

---

### Step 2 — API: Session Creation

In `app/api/study/sessions/route.ts` (POST with `listId`, line ~296):

- Accept `studyMode` from `body` alongside `studyDirection`
- Save it on the new `StudySession` document

---

### Step 3 — API: Session Sync (Core Logic)

In `app/api/study/sessions/route.ts` (POST with `results`, line ~144):

After existing aggregate SM-2 update, find or create the matching `modePerformance` entry for the session's `(studyMode, studyDirection)`:

```typescript
const mode = sessionMeta?.studyMode || 'classic';
const direction = sessionMeta?.studyDirection || 'front-to-back';

let modePerf = cardPerf.modePerformance?.find(
  (mp: any) => mp.mode === mode && mp.direction === direction
);
if (!modePerf) {
  cardPerf.modePerformance = cardPerf.modePerformance || [];
  cardPerf.modePerformance.push({ mode, direction, correctCount: 0, incorrectCount: 0 });
  modePerf = cardPerf.modePerformance[cardPerf.modePerformance.length - 1];
}
if (result.isCorrect) modePerf.correctCount++;
else modePerf.incorrectCount++;

// Run separate SM-2 per mode
const updatedModeSM2 = calculateSM2(modePerf.mlData, result.isCorrect, result.confidenceRating);
modePerf.mlData = updatedModeSM2;
```

Also update `CardResult` documents to include `studyMode` and `studyDirection`.

---

### Step 4 — Sync Service & Context

**`lib/services/syncService.ts`** (line ~476):

Add `studyMode` to the payload built in `syncSingleSession`:
```typescript
studyMode: historyEntry?.studyMode || 'classic',
```

**`contexts/StudySessionContext.tsx`** — `completeSession` function:

When saving to `studyHistory` in IndexedDB, include `studyMode` in the history entry object.

Also ensure `sessionMeta` passed to the API sync includes `studyMode`.

---

### Step 5 — Due Cards API

In `app/api/study/due-cards/route.ts`, when querying `mlData.nextReviewDate`, also check per-mode due dates from `modePerformance[].mlData.nextReviewDate`. A card is due if **any** of its mode-specific SM-2 dates are past due, or if a mode has never been attempted (no `modePerformance` entry for that combo). This surfaces cards that haven't been tested in a specific direction.

---

### Step 6 — Analytics API

In `app/api/study/analytics/route.ts`, add a new `modeBreakdown` field to the response:

```typescript
// Per (mode × direction) accuracy for each card
modeBreakdown: {
  mode: string;
  direction: string;
  accuracy: number;
  attempts: number;
}[]
```

Also update `problemCards` to include a `weakestMode` field indicating which (mode × direction) combo has the lowest accuracy for that card.

---

### Step 7 — Results UI: Mode Insight Panel

In `components/study/StudySessionResults.tsx`, add a new panel below the main results:

**"Study Style Insights"** section:
1. Shows a 2×2 (or 2×3) grid of mode tiles: front-to-back classic, back-to-front classic, front-to-back multiple-choice, back-to-front multiple-choice
2. Each tile shows: accuracy for that mode (from per-mode data), or "Not tried yet" with a muted style
3. **Nudge logic**:
   - If user only studied front-to-back → highlight back-to-front tile with a "Try this!" badge and message: *"You've never tested yourself in reverse. Back-to-front recall is the gold standard for true mastery."*
   - If user's back-to-front accuracy is significantly lower than front-to-back → badge on back-to-front: *"You're weaker in reverse — review these cards back-to-front to close the gap."*
   - If user only studied classic → nudge toward multiple choice: *"Multiple choice tests recognition accuracy differently — try it to reveal blind spots."*
4. "Study Again" buttons per tile that pre-set mode + direction and restart session

**Implementation details:**
- Fetch mode data from the analytics API (or pass via context from the completed session)
- Use the `studyMode` and `studyDirection` already in `StudySessionContext`
- Keep the nudge panel collapsible on mobile

---

## Data Flow Summary

```
Session starts
  → POST /api/study/sessions { listId, studyDirection, studyMode }
  → StudySession created with mode + direction

User answers cards
  → CardResults stored in IndexedDB with mode + direction

Session completes
  → StudySessionHistory saved to IndexedDB (includes studyMode)
  → syncSession() called

Sync to server
  → POST /api/study/sessions { results, setId, sessionMeta: { studyMode, studyDirection, ... } }
  → For each result:
      - Update aggregate cardPerformance (existing, unchanged)
      - Find/create modePerformance entry for (mode × direction)
      - Run SM-2 on the mode-specific mlData
  → Save StudySession with studyMode

Results page renders
  → Loads per-mode stats from analytics API
  → Renders mode-insight panel with nudges
  → "Try this mode" buttons link back to setup with pre-filled mode + direction
```

---

## Verification

1. **Unit**: Call `calculateSM2` with mode-specific `mlData` and verify interval/EF updates independently per mode
2. **API test**: Complete a front-to-back classic session, then a back-to-front classic session on the same set — verify `modePerformance` has two distinct entries with independent SM-2 data
3. **UI**: After a front-to-back session, verify the back-to-front tile shows "Not tried yet" and the nudge appears
4. **Due cards**: Mark a card's front-to-back SM-2 as far-future, but leave back-to-front untried — verify it appears as due
5. **Offline**: Complete a session offline, go online, sync — verify `studyMode` is preserved in the synced record
