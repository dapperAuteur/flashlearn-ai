# Video Script: Save and Organize Your Flashcards

**Duration:** 5-7 minutes
**Format:** Talking head intro/outro + screen recording

---

## INTRO (0:00 - 0:30)

**[ON CAMERA]**
"In the last video, you learned how to generate flashcards with one API call. But what if you want to create your OWN cards? Or edit them? Or see what other people have made?

Today I'll show you how to manage flashcard sets — create, update, delete, and browse. Let's do it."

---

## PART 1: Create a Set by Hand (0:30 - 2:00)

**[SCREEN RECORDING]** Terminal

**[ON CAMERA - voiceover]**
"Sometimes you want to type your own flashcards instead of using AI. Here's how."

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/sets \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Math Facts",
    "flashcards": [
      { "front": "7 x 8", "back": "56" },
      { "front": "6 x 9", "back": "54" },
      { "front": "12 x 12", "back": "144" }
    ]
  }'
```

"You give it a title and a list of cards. Each card has a front — that's the question — and a back — that's the answer."

**[SCREENSHOT]** The response showing the new set with its ID

"See that ID in the response? Copy it. You'll need it to do anything with this set later."

**[GOTCHA]** "Every card MUST have both a front and a back. If you leave one empty, you'll get an error."

---

## PART 2: List All Your Sets (2:00 - 2:45)

**[SCREEN RECORDING]**

```bash
curl https://flashlearnai.witus.online/api/v1/sets \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[ON CAMERA - voiceover]**
"This shows you every set you've made. The ones you generated with AI AND the ones you created by hand. You get the title, card count, and when it was created."

**[PRODUCTION NOTE]** Show the response and highlight pagination info: "If you have lots of sets, add ?page=2 to see more"

---

## PART 3: Update a Set (2:45 - 3:45)

**[SCREEN RECORDING]**

```bash
curl -X PATCH https://flashlearnai.witus.online/api/v1/sets/YOUR_SET_ID \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Math Facts - Updated",
    "flashcards": [
      { "front": "7 x 8", "back": "56" },
      { "front": "6 x 9", "back": "54" },
      { "front": "12 x 12", "back": "144" },
      { "front": "11 x 11", "back": "121" }
    ]
  }'
```

**[ON CAMERA - voiceover]**
"PATCH lets you update any set you own. Change the title, add more cards, fix mistakes."

**[GOTCHA]** "Here's the big thing to know: when you update the flashcards, you have to send ALL of them — not just the new ones. It replaces the whole list. So include the old cards too."

---

## PART 4: Delete a Set (3:45 - 4:15)

**[SCREEN RECORDING]**

```bash
curl -X DELETE https://flashlearnai.witus.online/api/v1/sets/YOUR_SET_ID \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[ON CAMERA - voiceover]**
"Don't need a set anymore? Delete it. But be careful — there's no undo. Once it's gone, it's gone."

**[PRODUCTION NOTE]** Show a brief "Are you sure?" style graphic overlay

---

## PART 5: Browse Public Sets (4:15 - 5:30)

**[SCREEN RECORDING]**

```bash
curl "https://flashlearnai.witus.online/api/v1/sets/explore?search=biology&sort=popular" \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

**[ON CAMERA - voiceover]**
"This is one of my favorite features. You can search for flashcard sets that other people have made and shared publicly. Search by topic, sort by most popular or most recent."

**[SCREEN RECORDING]** Also show categories:

```bash
curl https://flashlearnai.witus.online/api/v1/categories \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

"You can also browse by category. Science, math, languages — whatever you're into."

---

## OUTRO (5:30 - 6:00)

**[ON CAMERA]**
"Now you can create sets, update them, browse other people's sets, and clean up ones you don't need. In the next video, we get to the really cool part — studying with spaced repetition, which is scientifically proven to help you remember more.

See you there."

**[PRODUCTION NOTE]** End card with links to next video and developer portal
