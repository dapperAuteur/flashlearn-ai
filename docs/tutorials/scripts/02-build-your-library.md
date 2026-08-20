# Video script 02: Building a library so you stop scrolling

{{video:PENDING}}

**What the viewer will be able to do:** pick out the handful of sets they actually study, keep them
on their own shelf, and land on that shelf every time they sign in instead of searching a catalogue
of a hundred-plus public sets.

**Length:** aim for 3 to 4 minutes.

---

## Setup before you record

| Needs to be true | Why |
|---|---|
| Signed in on an account whose library is **empty** | Beat 2 is the empty state. An account that already has a shelf skips the part most viewers are at |
| The math seed loaded (`npm run seed:math`), so Explore has well over a hundred public sets | The problem the feature solves has to be visible on screen or the feature looks like busywork |
| One set you created yourself, saved before you hit record | Beat 6 shows it already on the shelf. Creating it on camera adds two minutes of typing |
| A set you have studied at least once, and a second one you have not | Beat 5 compares "Studied today" against "Not studied yet" in the sort order |
| **Online** | The shelf reads and writes to the server. Offline the buttons will fail and the take is wasted |
| Browser zoom at 100%, window wide enough to show three cards per row on Explore | The scroll in beat 1 is the argument. It needs to look like real scrolling |

---

## The beats

### 1. Open on the problem, not the feature

**On screen:** go straight to **Explore**. Scroll. Keep scrolling. Do not narrate the controls yet.

**Say:** "There are more than a hundred public sets in here now, and they are sorted newest first. If
what you want is the seven times table, this is what finding it looks like every single day."

**Why it matters:** a viewer who has not felt the problem hears the rest as an optional extra. Ten
seconds of honest scrolling does more than any explanation.

### 2. Show the empty shelf

**On screen:** go to the **Dashboard**. **Your Library** is the first block, and it is empty, with
two buttons: **Browse sets to add** and **Make your own**.

**Say:** "This is where you land when you sign in. Right now it is empty, which is the whole reason
the last thirty seconds felt the way it did."

**Why it matters:** anchors the payoff before the click path starts, so every add in beat 3 has a
visible destination.

### 3. Add two or three sets

**On screen:** back on Explore, find a math fact set. Each card has **Study Now** and, next to it,
**Add to library**. Click it. The label changes to **In your library**. Add two more.

**Say:** "One button per card. It says Add to library, and once it is added it says In your library.
Not a colour change, an actual change of words, because a colour is no use to anybody using a screen
reader."

**Why it matters:** names the accessibility choice out loud in one sentence. It costs nothing and it
is true.

### 4. Say what "add" actually does

**On screen:** stay on the card you just added.

**Say:** "It did not copy the set. Your shelf points at the original. That matters more than it
sounds: we fixed three wrong answers in the math sets this month, and everybody who keeps those sets
got the fix. If adding made a copy, you would still be studying the wrong answer."

**Why it matters:** this is the design decision most likely to be misunderstood, and the math
correction is a concrete example rather than a hypothetical.

### 5. Go back to the shelf and read the order

**On screen:** Dashboard again. The sets are there. Point at the line under each title: card count,
then **Studied today** or **Not studied yet**.

**Say:** "Most recently studied first, then whatever you added most recently. So the set you drilled
this morning is at the top tomorrow, and you did not have to do anything to put it there."

**Why it matters:** the sort is the difference between a shelf and a bookmarks folder. Show it
rather than claiming it.

### 6. Point out the set you made

**On screen:** find your own set in the list. It carries a **Yours** label.

**Say:** "I never added this one. Anything you create goes on your shelf when you save it. If your
own work were missing from this list, you would assume the save had failed, and you would be right
to."

**Why it matters:** pre-empts a support question, and explains the reasoning in one line.

### 7. Remove something, then put it back

**On screen:** remove a set you have studied. Confirm it disappears. Go to Explore, find it, add it
again, then open **Analytics** or the set page and show the history is intact.

**Say:** "Removing takes it off the shelf. It does not touch your progress. Your streak, your review
schedule, everything you have answered on that set is still there when you add it back."

**Why it matters:** people hesitate to remove things when they suspect it deletes something. Show
that it does not, once, and they will keep the shelf tidy.

### 8. Close on the limit that is not there

**On screen:** the shelf, with everything you added.

**Say:** "There is no cap. Keep three sets or keep forty. The point is not to make you ration
anything, it is that what you open every day is the first thing you see."

**Why it matters:** ends on the honest scope of the feature rather than promising a system it is not.

---

## Careful while recording

- **The empty state only happens once per account.** Record beat 2 first, or use a fresh test
  account, because once you add a set you cannot get it back without removing everything.
- **Beat 7 removes a real set from a real shelf.** Use a set you are willing to add back, and check
  the progress you point at afterwards actually exists. Pointing at an empty analytics page mid-take
  undercuts the claim.
- **Do not record with two or three public sets in the catalogue.** Beat 1 is the argument for the
  whole feature and it needs a catalogue big enough to be annoying.
- Set titles and your own account name are on screen throughout. Use a test account, or blur.

## Related

- `plans/future/05-user-library-of-sets.md`. The design, including why the shelf points at the set
  instead of copying it
- `models/LibraryEntry.ts`. The unique `(profile, set)` index beat 3 relies on
- `lib/library/libraryService.ts`. The only place library rows are written
