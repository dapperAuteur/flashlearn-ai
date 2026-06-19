# Build flashcards from your own content with the FlashLearn API

A copyable recipe for any ecosystem or third-party app that wants to turn an
authored question pool into FlashLearn study decks and track each learner's
progress. Centenarian Academy follows this to build cards from its post-quiz
banks; the same steps work for any app.

This is the path for **authored content and general learners**. If your learners
are children and your cards should be generated from a curriculum standard, use
the child flow instead (`/docs/api/ecosystem`).

## 1. Base URL, auth, and your key

- Base URL: `https://flashlearnai.witus.online/api/v1`
- Every request carries a bearer token: `Authorization: Bearer <your_key>`
- App keys (`fl_app_`) and ecosystem keys (`fl_eco_`) can both use this flow. Your
  key needs the permissions `sets:read`, `sets:write`, and `study:*`. Ecosystem
  keys carry these by default.

A quick check that auth works:

```bash
curl https://flashlearnai.witus.online/api/v1/sets \
  -H "Authorization: Bearer $FLASHLEARN_KEY"
```

A 200 with a (possibly empty) `sets` array means you are in. A
`401 "Invalid API key prefix."` means the key is not one FlashLearn recognizes.

## 2. Create a set from your pool

Map each source item to a card. `front` is the prompt, `back` is the answer plus
any explanation. Give each card an `externalId`: a stable string from your system
that you will use later to report results. It is optional but needed for
per-student scheduling.

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/sets \
  -H "Authorization: Bearer $FLASHLEARN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "NASM CES Accelerator — Glossary",
    "description": "Key terms for the NASM CES exam.",
    "isPublic": true,
    "flashcards": [
      { "front": "Abduction", "back": "A body segment moving away from the midline.", "externalId": "ces:glossary:abduction" }
    ]
  }'
```

The response returns `id` (the set id) and `cardCount`. Each returned card carries
its `id` and the `externalId` you sent. A 169-card set is one request: the cards
ride in the body, so you are not making 169 calls.

One set per content type or per module works well. For a one-time bulk import of
~20 sets, stay under the ecosystem burst limit of 60 requests per minute (a short
loop is fine).

## 2b. Authored multiple-choice options

If your quiz already has options (one correct, several distractors), put them on
the card instead of letting FlashLearn generate distractors. Add `options`
(at least two `{ id, text }`) and `correctOptionId` (matching one option id):

```json
{
  "front": "Which muscle abducts the arm at the shoulder?",
  "back": "Deltoid",
  "externalId": "ces:m3:q7",
  "options": [
    { "id": "a", "text": "Deltoid" },
    { "id": "b", "text": "Pectoralis major" },
    { "id": "c", "text": "Latissimus dorsi" },
    { "id": "d", "text": "Trapezius" }
  ],
  "correctOptionId": "a"
}
```

When a card has options, multiple-choice study shows exactly those (scored by
`correctOptionId`); cards without options fall back to generated distractors, so
you can mix both in one set. `correctOptionId` must match an option id or the
create call returns `400`. Options come back on `GET /api/v1/sets/{id}` and on the
study session payload.

## 2c. Images on cards (e.g. identify the muscle)

A card can carry an image on either side. Set `frontImage`/`backImage` to an https
URL and always pass `frontImageAlt`/`backImageAlt` so screen-reader users get a
description. The URL can be your own CDN, or one you get from our upload endpoint:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/media \
  -H "Authorization: Bearer $FLASHLEARN_KEY" \
  -F "file=@deltoid.png"
# => { "url": "https://res.cloudinary.com/.../deltoid.png", "publicId": "...", "type": "image" }
```

Then put that URL on a card (this pairs naturally with authored options to make an
"identify the muscle" question):

```json
{
  "front": "Which muscle is highlighted?",
  "back": "Deltoid",
  "frontImage": "https://res.cloudinary.com/.../deltoid.png",
  "frontImageAlt": "Posterior view of the shoulder with the deltoid highlighted",
  "options": [
    { "id": "a", "text": "Deltoid" },
    { "id": "b", "text": "Trapezius" },
    { "id": "c", "text": "Rhomboid major" }
  ],
  "correctOptionId": "a"
}
```

Image URLs must be `https` (a plain `http` URL is rejected with `400`).

Video works the same way: set `frontVideo`/`backVideo` to an https URL (with
`frontVideoAlt`/`backVideoAlt`) and study renders a player. Upload video (mp4,
webm, mov, to 50MB) through the same `POST /api/v1/media` endpoint.

## 3. Read progress for your dashboard

Two reads back a "mastered / due" view.

Per-card SM-2 state for a set:

```bash
curl "https://flashlearnai.witus.online/api/v1/study/analytics/<setId>" \
  -H "Authorization: Bearer $FLASHLEARN_KEY"
```

Cards that are due now:

```bash
curl "https://flashlearnai.witus.online/api/v1/study/due-cards?setId=<setId>" \
  -H "Authorization: Bearer $FLASHLEARN_KEY"
```

Without an `externalStudentId`, both reads report the key owner's own progress.
To show a specific student, add `externalStudentId` (see the next step).

## 4. Track each student with externalStudentId

Your students do not need FlashLearn accounts. Pass your own opaque student id and
FlashLearn keeps a separate SM-2 record per student.

When a student answers in your course quiz, push the result:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/study/external-results \
  -H "Authorization: Bearer $FLASHLEARN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "setId": "<setId>",
    "externalStudentId": "academy-user-123",
    "results": [
      { "cardExternalId": "ces:m8:q3", "isCorrect": false, "confidenceRating": 2, "source": "course_quiz", "occurredAt": "2026-06-18T13:00:00Z" }
    ]
  }'
```

- Cards are addressed by `cardExternalId` (the `externalId` you set at creation).
  Unknown ids come back in `unresolvedCardExternalIds` rather than being dropped.
- A wrong answer schedules the card sooner; a correct answer pushes it out, via
  the SM-2 algorithm.
- Idempotent on `(externalStudentId, cardExternalId, occurredAt)`. Re-POST the
  same result after a network blip and it is counted once. The response shows
  `applied` vs `duplicates`.

Then read that one student's progress:

```bash
curl "https://flashlearnai.witus.online/api/v1/study/analytics/<setId>?externalStudentId=academy-user-123" \
  -H "Authorization: Bearer $FLASHLEARN_KEY"

curl "https://flashlearnai.witus.online/api/v1/study/due-cards?externalStudentId=academy-user-123" \
  -H "Authorization: Bearer $FLASHLEARN_KEY"
```

## 5. Later: let a student claim a FlashLearn account

A student tracked by `externalStudentId` can convert to a full FlashLearn account
through "Sign in with FlashLearn" (on the roadmap). Because every result is stored
against `(your key, externalStudentId)` from day one, the claim re-parents that
history onto the new account instead of rebuilding it. You keep using
`externalStudentId` to read progress in the meantime.

## Reference

- Machine-readable spec: `GET /api/v1/openapi`
- Rate limits and errors: `/docs/api/getting-started`
- Child / curriculum-standard flow: `/docs/api/ecosystem`
