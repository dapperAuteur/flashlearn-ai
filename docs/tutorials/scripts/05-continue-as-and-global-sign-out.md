# Video script 05: "Continue as ..." and signing out of every WitUS app

{{video:PENDING}}

**What the viewer will be able to do:** sign in to FlashLearnAI without typing anything when they
already have a WitUS session open, and understand that signing out here signs them out of every
WitUS app on that browser.

**Length:** aim for 3 to 4 minutes.

---

## The mental model, before the click path

Two things are worth getting right in the viewer's head before any button is pressed, because the
buttons are trivial and the model is not.

**First: this is not a login shortcut, it is a question with a polite answer.** The sign-in page does
not wait for anything. It renders the same form it always has, and *at the same time* it asks
accounts.witus.online "do you know this browser?". If the answer comes back, the WitUS button
relabels itself. If the answer never comes — and on Safari and Firefox it usually will not, because
they refuse the third-party cookie the question depends on — the page says nothing at all and the
visitor has exactly the page they had before. There is nothing to fix and nothing to report. Do not
record a take that treats a missing "Continue as" as a failure.

**Second: the name on the button proves nothing.** It is a label. Clicking still runs the full
sign-in round trip with the identity provider, which is the only thing that decides who anyone is.
Say this out loud in the video, because a viewer who thinks the name *is* the login will misread what
the feature is doing.

---

## Setup before you record

| Needs to be true | Why |
|---|---|
| **Chrome or Edge**, not Safari or Firefox | Safari's ITP and Firefox's Total Cookie Protection block the third-party cookie the check depends on. The feature is *designed* to show nothing there, so nothing to film |
| `WITUS_OIDC_CLIENT_ID` and `NEXT_PUBLIC_WITUS_SSO=true` set on the environment you record against | With either unset both features are dark by design: no button, no check, and sign-out stays local |
| A WitUS account signed in **in another tab** on the same browser, on any WitUS app | This is the entire premise of beat 3. Without it the button just says "Sign in with WitUS" |
| A second, ordinary FlashLearnAI account with a password | Beat 6 needs a signed-in session to sign out of |
| Your real display name on the WitUS account is one you are willing to show | It goes on screen at full size in beat 3 |
| Two browser tabs arranged before you hit record | Beat 7 cuts between them; fumbling for the second tab wastes the take |

---

## The beats

### 1. The problem, in one sentence

**On screen:** the FlashLearnAI sign-in page, cold.

**Say:** "You are already signed in to WitUS in the next tab over. There is no good reason for this
page to ask you to type an email address."

**Why it matters:** names the annoyance before the fix, so the fix reads as obvious rather than
clever.

### 2. Load the page and say nothing about waiting

**On screen:** reload `/auth/signin`. Let the form appear at full speed. Do not narrate a loading
state — there is not one.

**Say:** "The form is here immediately. Nothing is blocked on anything."

**Why it matters:** the whole design choice is that the check is parallel. A viewer who thinks the
page waits for the identity provider will read every slow page load as this feature's fault.

### 3. The button changes its own label

**On screen:** the WitUS button, which now reads **Continue as** followed by your name. Point at it.
Do not click yet.

**Say:** "That changed on its own, a moment after the page arrived. It means the identity provider
recognised this browser. And it is only a label — it has not signed me in and it does not know
anything about my FlashLearnAI account yet."

**Why it matters:** this is the beat the whole video exists for, and it is also where a viewer is most
likely to over-read what happened.

### 4. Click it and let the round trip happen

**On screen:** click **Continue as ...**. Let the redirect to accounts.witus.online and back run at
real speed. Land on `/flashcards`.

**Say:** "That was the real sign-in, all of it. Same flow as clicking the plain button — the label
just saved me from typing."

**Why it matters:** shows that nothing was skipped, which is what makes the shortcut safe.

### 5. Show the other outcome on purpose

**On screen:** open a private window, go to `/auth/signin`. The button reads plain **Sign in with
WitUS**. No error, no spinner, no empty space where something should be.

**Say:** "Here the browser has no WitUS session, so the check found nothing — and the page tells me
nothing, because there is nothing to tell. This is also exactly what Safari and Firefox users see,
every time, and it is fine."

**Why it matters:** pre-empts the support ticket that says "the Continue as button is broken on my
Mac." It is not broken. It is the design.

### 6. Sign out, and read the button

**On screen:** back in the signed-in window, open the user menu. The item reads **Sign out of WitUS**,
not "Sign out". Pause on it before clicking.

**Say:** "Read that carefully. It does not say sign out, it says sign out of WitUS. This ends the
shared session, not just this app's."

**Why it matters:** the copy is doing the consent work. A viewer who clicks past it and then finds
themselves signed out of another app will read it as a bug.

### 7. Show what it actually did

**On screen:** click it. Land back on the FlashLearnAI home page. Now switch to the other tab — the
WitUS app you were signed in to in the setup — and reload it. It is signed out too.

**Say:** "One click, both apps. That is what 'of WitUS' meant."

**Why it matters:** the effect is invisible in the tab you clicked in. Without the second tab the
feature looks identical to an ordinary sign-out.

### 8. Close on the ordering, briefly

**On screen:** just you, or a title card.

**Say:** "One detail worth knowing: this app ends your session here first and only then hands you to
the identity provider. So if WitUS is having a bad day, you are still signed out of FlashLearnAI.
Sign out always means signed out."

**Why it matters:** it is the safety property of the whole feature and it costs ten seconds to say.

---

## What to be careful of

- **Do not record on Safari or Firefox.** Both block the third-party cookie the check needs, so
  "Continue as" will never appear and beats 2 through 4 have nothing to show. This is correct
  behaviour, not a bug to work around.
- **Your display name goes on screen** at full size in beat 3. Decide before recording whether that is
  the name you want published.
- **Beat 7 really signs you out of the other WitUS app.** If that tab has unsaved work in it, lose it
  before you record rather than during.
- **The private window in beat 5 needs to be genuinely fresh.** A private window reused from an
  earlier take may still hold the one-shot `sessionStorage` marker, which also suppresses the check —
  and then you will be filming the right screen for the wrong reason.
- **Nothing here is reversible mid-take.** Once you have clicked "Continue as" in beat 4 the browser
  holds a session, so beats 2, 3 and 5 have to be filmed before it, or filmed again in a fresh
  profile.
