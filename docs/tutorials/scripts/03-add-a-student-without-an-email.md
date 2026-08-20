# Video script 03: Adding a student who has no email address

{{video:PENDING}}

**What the viewer will be able to do:** put a student on a classroom roster using nothing but their
name, study with them the same day, and hand them a code that turns the account into their own later
without losing a single answer.

**Length:** aim for 5 to 6 minutes.

---

## Setup before you record

| Needs to be true | Why |
|---|---|
| Signed in as the **Teacher of the classroom you open**, or as an Admin | The roster checks the classroom, not the role. Another teacher's classroom refuses every write in this script |
| One classroom you teach, **not archived** | Adding a student and minting a claim code are both refused on an archived classroom |
| At least one student already on the roster who signed themselves up | Beat 5 compares a managed row against an ordinary one. With only managed rows there is nothing to compare |
| A short set to hand, for example a single math fact set | Beat 6 is a two minute study session, not a lesson |
| A test email address you can actually receive mail at | Beat 8 ends on a verification email. A fake address stalls the take |
| **Online** | Every roster action is a server write, and the proctoring picker turns itself off offline |
| A way to blur or reshoot the claim code, decided before you hit record | It is a working credential for that account and it will be on screen |

---

## The beats

### 1. Open with who the account belongs to

**On screen:** just you, or a title card. Do not open the app yet.

**Say:** "I am about to create an account for a student who has never given me an email address. The
thing to hold on to is that the account is theirs, not mine. I can put work into it and I can never
take it out, and at the end of this video they will be the one holding the keys."

**Why it matters:** every design decision in the feature follows from this. A viewer who thinks these
are the teacher's accounts will read the claim code as an inconvenience instead of the point.

### 2. The problem, in one sentence

**On screen:** your classroom roster, mostly empty.

**Say:** "Fourteen students in a room. Some have no email address, some have one they cannot remember
the password to, and none of them signed up before class. Without this, the lesson does not start."

**Why it matters:** gives the feature a reason before the click path begins.

### 3. Add the student by name

**On screen:** on the classroom roster, choose **Add student**. Type a name. Save. Nothing else is
asked for.

**Say:** "Name. That is the entire form. No email, no password, no invite to send, nothing for the
student to do first."

**Why it matters:** the shortness is the feature. Let the empty form sit on screen for a second.

### 4. The claim code shows once, so capture it now

**On screen:** the confirmation showing the claim code, ten characters in two groups. Point at it.
Write it on paper on camera, or read it into the mic.

**Say:** "Here is the only part of this you can get wrong. That code is shown once. Nothing stores it
in a form anyone can read back, so support cannot recover it and neither can I. Write it down before
you close this. If you do lose it, you are not stuck: you mint a new one from the roster, and the old
one stops working the second you do."

**Why it matters:** this is the beat that saves a support ticket. The dialog makes you confirm with
**I have written the code down**, so let the camera see you actually do it. Do not rush, and do not
dismiss the dialog while you are still talking.

### 5. Read the roster row

**On screen:** the new student on the roster next to a student who signed themselves up. Show that the
managed row is marked as managed and shows no email address, and that a claim code is outstanding with
an expiry date on it.

**Say:** "The roster tells you which accounts you are looking after. The managed one has no address to
show, because the one it holds is a placeholder that cannot receive mail. The code expires in ninety
days, and when it does you mint another."

**Why it matters:** a teacher needs to tell the two kinds of account apart at a glance, because almost
everything they can do differs.

### 6. Study with them the same day

**On screen:** start a study session, pick the new student in the **Who is studying?** picker, run
three or four cards, finish.

**Say:** "They exist properly now, so everything from the proctoring video works. I hold the device,
they answer, and it lands on their account and their review schedule."

**Why it matters:** connects this to script 01 and shows the account is a real one rather than a
placeholder row.

### 7. Say the limitation out loud

**On screen:** back on the roster.

**Say:** "Now the honest part. This student cannot sign in. Not on my device, not at home, not on a
phone. There is no password on the account and there is no screen anywhere that lets me set one. This
is a tool for running a class, not a way to onboard somebody onto the app. If a student already has an
email address, send them to sign up and join with the classroom code instead, because that gets them
everything at once."

**Why it matters:** the feature gets misused when this is discovered rather than told. Say it while
the roster is on screen, where it applies.

### 8. Hand the account over

**On screen:** open the claim page at **/claim** as the student, the address the claim code dialog
names. Enter the code from beat 4, an email address, a password, and tick the confirmation that they
are 13 or older. Submit. Then open their study history and show the session from beat 6 sitting there.

**Say:** "Same account, so the work came with it. The session we just ran, the cards they missed, the
dates those cards are due back. None of it moved, because nothing needed to move. They verify the
email address, and after that they sign in like anybody else."

**Why it matters:** this is the payoff, and it is the claim in beat 1 being made good on camera.

### 9. Why I cannot just set their password

**On screen:** narration over the roster, or straight to camera.

**Say:** "People ask for a button that sets the student's password, and there is not going to be one.
A teacher who can set the password can sign in as the student, and then nothing in the record can tell
which of us answered a card. The whole value of running a session for somebody is that the two of you
stay distinguishable."

**Why it matters:** turns a missing feature into a stated decision, which is the difference between
looking unfinished and looking considered.

### 10. Removing is not deleting

**On screen:** remove a student from the roster. Show the message saying the account was not deleted.

**Say:** "Removing takes them off my roster. It does not delete the account and it does not touch a
single thing they studied. Most removals are corrections, wrong class or a duplicate name, and losing
a term of somebody's work to a typo would be indefensible. What I do lose is the ability to run
sessions for them or mint them a code, because both of those came from them being in my classroom."

**Why it matters:** teachers tidy rosters at the end of term. They need to know what that button does
before they use it on fourteen rows.

### 11. Close on what this is not

**On screen:** the roster.

**Say:** "Two things this does not do yet. There is no way to paste a class list and create thirty at
once, so it is one at a time. And there is no avatar or PIN for these students to log in with, because
they do not log in at all. Adding students one by one is what makes tomorrow's lesson work; the rest
can come later."

**Why it matters:** ends on the real edge of the feature instead of implying a bulk flow that does not
exist.

---

## Careful while recording

- **The claim code on screen is a live credential** for that account for the next ninety days. Blur
  it, or mint a replacement immediately after recording so the one on camera is dead.
- **Everything here is real.** The account is created, the study session is recorded, and beat 8 sends
  an actual verification email to whatever address you type. Use a test classroom and an address you
  own.
- **Beat 8 spends the code.** If you need a second take of the claim, mint a fresh code first, because
  a spent one comes back as invalid rather than as anything explanatory.
- **An archived classroom refuses beats 3 and 4** and will look like a bug on camera. Check the
  classroom is live before you record.
- **Removing in beat 10 also ends your access to that student.** Do it on a throwaway row, not on the
  student you spent the video creating.
- Real names appear on the roster. Use test accounts, or blur.

## Related

- `docs/tutorials/scripts/01-proctored-study-session.md`, which beat 6 assumes the viewer has seen
- `plans/04-teacher-managed-students.md`, the design and what was deliberately left out
- `lib/teacher/managedStudents.ts`, the claim code, its alphabet, and its 90 day life
- `lib/teacher/classroomAccess.ts`, the authorization rule beat 3 depends on
