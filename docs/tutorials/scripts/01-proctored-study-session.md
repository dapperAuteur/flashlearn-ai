# Video script 01 — Testing a student on their own account

{{video:PENDING}}

**What the viewer will be able to do:** run a student through a flashcard set on their own device
and have every answer recorded on that student's account, so the student's spaced review schedule
learns what they got wrong.

**Length:** aim for 4 to 5 minutes.

---

## Setup before you record

| Needs to be true | Why |
|---|---|
| Signed in as a Teacher, Tutor, Parent, SchoolAdmin, or Admin | A Student account cannot proctor, and the picker will not appear |
| At least one classroom you teach, with **two or more** students enrolled | One student makes the dropdown look like a formality. Two shows it is a choice |
| At least one of those students has studied before | So their history has something in it to compare against at the end |
| A math fact set to hand, for example "Multiplication Facts: 7 × 0 to 7 × 10" | Short, and the answers are unarguable on camera |
| **Online.** Turn off any offline simulation | The picker disables itself offline, on purpose. Explaining that mid-take is a detour |
| Have the student's own account ready to sign into, or a second browser profile | Beat 7 is the payoff and it needs their view |

---

## The beats

### 1. Open with the mental model, not the app

**On screen:** just you, or a title card. Do not open the app yet.

**Say:** "Normally when you study, the results are yours. This is the opposite. You are going to hold
the device, the student is going to answer out loud, and everything gets written to *their* account,
not yours. Hold on to that, because everything else follows from it."

**Why it matters:** a viewer who misses this will misread every screen that follows. This is the one
beat worth re-recording until it is clean.

### 2. Why you would want this

**On screen:** a student sitting with you, or just narration over the study screen.

**Say:** "A student who cannot read the screen yet, or cannot type fast, still needs their misses
tracked. Otherwise spaced repetition never learns what they are actually struggling with."

**Why it matters:** gives the feature a reason to exist before the click path starts.

### 3. Start a session and find the picker

**On screen:** go to **Study**, choose your set. On the last step, above **Study Mode**, there is a
card headed **Who is studying?** with a dropdown reading **Myself**.

**Say:** "Here is the whole feature. One dropdown. It says Myself by default, and it will say Myself
every single time, because recording onto somebody else's account should never be something that
just happens."

**Why it matters:** names the safe default out loud, so nobody assumes the last choice sticks.

### 4. Pick the student

**On screen:** open the dropdown. Students you can record for are listed with their classroom in
brackets. Pick one. A line appears underneath: **This session will be saved to [name], not to you.**

**Say:** "Only students in classrooms I teach show up here. I cannot pick somebody else's student
even if I know their name."

**Why it matters:** answers the privacy question before a viewer thinks to ask it.

### 5. Linger on the banner

**On screen:** start the session. Point at the amber banner above the card: **Recording for [name]**.
Scroll the card area to show the banner does not move.

**Say:** "This stays there for the whole session. If it ever names the wrong person, stop. Do not
finish the session and fix it after. Wrong answers written to the wrong student change what that
student sees for weeks, because it drives their review schedule."

**Why it matters:** this is the safety beat. Say it plainly and do not rush it.

### 6. Run a few cards

**On screen:** answer three or four aloud, tapping correct and incorrect. Miss one on purpose.

**Say:** "They answer, I tap. That is the whole loop."

**Why it matters:** shows how fast it is, which is the practical case for using it at all.

### 7. Show where it landed

**On screen:** finish. Then sign in as the student, or switch browser profile, and open their study
history and their due cards. The card they missed is scheduled to come back.

**Say:** "Their history, their schedule, and the one they missed is already queued to return. Nothing
landed on my account."

**Why it matters:** this is the payoff. Without seeing the student's screen, a viewer has only your
word for it.

### 8. Two things that surprise people

**On screen:** back on the study setup, briefly.

**Say:** "Two things worth knowing. The student can see the session was proctored, in their own
history. It is not hidden from them. And you will notice there is no confidence rating in this mode,
because that is the student's own read on how sure they were, and me guessing it would poison the
data it feeds."

**Why it matters:** both generate support questions otherwise, and both are deliberate.

### 9. Close on the boundary

**On screen:** turn off the network, or open the picker while offline, to show it greyed out.

**Say:** "One limit. This needs a connection. Offline, your device saves work against whoever is
signed in, which would be me. Rather than quietly file a student's work under my name, it turns
itself off and says why."

**Why it matters:** ends on the honest edge of the feature rather than overselling it.

---

## Careful while recording

- **The session is real.** Everything you record lands on that student's actual account and actual
  review schedule. Use a test student, or be ready to explain the extra session to a real one.
- **The picker renders nothing if you have no students**, so a fresh account will make you think the
  feature is missing. Check your classroom roster before you hit record.
- **Do not record with only one student enrolled.** A one-item dropdown makes the choice look
  decorative, which undercuts beat 3.
- Everything on screen is a real name. Use test accounts, or blur.

## Related

- `plans/01-proctored-study-sessions.md`
- `lib/study/resolveStudySubject.ts` — the authorization rule beat 4 describes
