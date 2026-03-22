# Video Script: Make Your First Flashcards with Code

**Duration:** 5-7 minutes
**Format:** Talking head intro/outro + screen recording

---

## INTRO (0:00 - 0:45)

**[ON CAMERA]**
"What if I told you that you could create flashcards on any topic — in any language — with a single line of code? No app to download. No account to manage. Just one command, and boom — you've got study materials powered by AI.

Today I'm going to show you how to use the FlashLearnAI.WitUS.Online API to generate flashcards in less than 60 seconds. And it's completely free to start.

Let's go."

**[PRODUCTION NOTE]** Quick, energetic delivery. Show excitement. Consider a text overlay: "FREE API - No Credit Card"

---

## PART 1: What is an API? (0:45 - 1:30)

**[ON CAMERA]**
"First — what even is an API? Think of it like ordering food. You don't go into the kitchen and cook it yourself. You tell the waiter what you want, and they bring it to you.

An API works the same way. You send a message that says 'make me flashcards about the solar system.' The AI does its thing in the background. And a few seconds later, you get flashcards back. Ready to use."

**[PRODUCTION NOTE]** Consider a simple animation: Restaurant metaphor with "You → API → AI → Flashcards" flow

---

## PART 2: Getting Your API Key (1:30 - 2:30)

**[SCREEN RECORDING]**
1. Open browser, go to `flashlearnai.witus.online/auth/signup`
2. Create account (show form fill)
3. Navigate to `flashlearnai.witus.online/developer`
4. Click "API Keys" tab
5. Click "New Key"
6. Type name: "My First Key"
7. Click Create

**[SCREENSHOT]** Capture the moment the key is revealed — this is a good thumbnail candidate

**[ON CAMERA - voiceover during screen recording]**
"Head to flashlearnai.witus.online and sign up for free. Then go to the Developer Portal, click New Key, give it a name, and hit Create.

Now here's the important part — copy this key RIGHT NOW. You'll only see it once. It starts with f-l-underscore-pub-underscore."

**[GOTCHA]** "If you lose this key, you can't get it back. You'll need to create a new one. So paste it somewhere safe — a text file, a notes app, whatever works."

---

## PART 3: Your First API Call (2:30 - 4:00)

**[SCREEN RECORDING]** Open terminal

**[ON CAMERA - voiceover]**
"Now open your terminal. On Mac, that's the Terminal app. On Windows, use PowerShell or Command Prompt. And paste this command:"

**[SCREEN RECORDING]** Type or paste:
```bash
curl -X POST https://flashlearnai.witus.online/api/v1/generate \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "The Solar System"}'
```

**[GOTCHA]** "Make sure you replace YOUR_KEY with the actual key you copied. The whole thing — f-l-underscore-pub-underscore and then the long random string."

**[ON CAMERA - voiceover]**
"Hit Enter... and wait a few seconds..."

**[SCREEN RECORDING]** Show the JSON response appearing

"And there it is! The AI just created flashcards about the solar system. Look at this — each card has a front, which is the question, and a back, which is the answer."

**[SCREENSHOT]** Capture the JSON response with flashcards visible — good for thumbnail

**[PRODUCTION NOTE]** Zoom in on the JSON response. Highlight or box the "front" and "back" fields.

---

## PART 4: Try Different Topics (4:00 - 5:00)

**[SCREEN RECORDING]** Change the topic to different subjects:

```bash
# Spanish
curl -X POST https://flashlearnai.witus.online/api/v1/generate \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Basic Spanish Greetings"}'
```

**[ON CAMERA - voiceover]**
"Now change the topic to whatever YOU want to study. Spanish greetings? Done. JavaScript closures? Done. The history of pizza? Why not."

**[B-ROLL]** Quick montage of different topics and their flashcard results scrolling by

---

## PART 5: Using Code Instead of Terminal (5:00 - 6:00)

**[SCREEN RECORDING]** Show VS Code with a JavaScript file:

```javascript
const response = await fetch('https://flashlearnai.witus.online/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fl_pub_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ topic: 'JavaScript Promises' }),
});

const { data } = await response.json();
console.log(`Made ${data.cardCount} flashcards!`);
```

**[ON CAMERA - voiceover]**
"If you're a developer, you probably want to use this in actual code, not just the terminal. Here's the same thing in JavaScript. Same thing in Python. Same API, any language."

---

## OUTRO (6:00 - 6:30)

**[ON CAMERA]**
"That's it. One API call. Free tier gives you 100 generations per month — that's plenty to build a prototype or study for your exams.

In the next video, I'll show you how to organize your flashcards into sets and browse cards other people have made. Link's in the description.

If this helped you, hit subscribe. I'll see you in the next one."

**[PRODUCTION NOTE]** End card with:
- Subscribe button
- Link to next video
- Link to flashlearnai.witus.online/developer
- Text: "Free API Key — No Credit Card Required"
