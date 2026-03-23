# Tutorial 1: Make Your First Flashcards with Code

## What you'll learn

- What an API is and why it's useful
- How to get your free API key
- How to create flashcards by typing one command

## What you need

- A computer with internet
- A terminal (the black screen where you type commands)
- 5 minutes

---

## What is an API?

An API is like a waiter at a restaurant. You tell the waiter what you want. The waiter goes to the kitchen and brings back your food. You never go into the kitchen yourself.

The FlashLearnAI.WitUS.Online API works the same way. You send it a topic (like "Solar System"). It goes to the AI kitchen and brings back flashcards. You never have to build the AI yourself.

---

## Step 1: Get your free API key

An API key is like a password. It tells the API who you are.

1. Go to [flashlearnai.witus.online/auth/signup](https://flashlearnai.witus.online/auth/signup)
2. Create an account (it's free)
3. Go to [flashlearnai.witus.online/developer](https://flashlearnai.witus.online/developer)
4. Click **API Keys** then **New Key**
5. Type a name like "My First Key"
6. Click **Create**
7. **Copy the key right now!** It starts with `fl_pub_` and you'll only see it once

Save it somewhere safe. You'll use it in the next step.

---

## Step 2: Make your first flashcards

Open your terminal and paste this command. Replace `YOUR_KEY` with the key you just copied:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/generate \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "The Solar System"}'
```

Press Enter and wait a few seconds.

### What happened?

You sent a message to the API that said: "Please make flashcards about The Solar System."

The API used AI to create flashcards and sent them back to you.

---

## Step 3: Read the response

You'll see something like this:

```json
{
  "data": {
    "flashcards": [
      {
        "front": "How many planets are in our solar system?",
        "back": "Eight: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune"
      },
      {
        "front": "What is the largest planet?",
        "back": "Jupiter"
      },
      {
        "front": "Which planet is closest to the Sun?",
        "back": "Mercury"
      }
    ],
    "setId": "abc123def456",
    "source": "generated",
    "cardCount": 10
  }
}
```

Let's break this down:

- **flashcards** — This is a list of your cards. Each card has a `front` (the question) and a `back` (the answer).
- **setId** — This is the ID for your set of cards. You can use it later to study or share them.
- **source** — This says `"generated"` because the AI made them fresh. If someone already made cards on this topic, it might say `"shared"` instead.
- **cardCount** — How many cards were made. Usually between 5 and 20.

---

## Step 4: Try a different topic

Change the topic to anything you want to learn:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/generate \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Basic Spanish Greetings"}'
```

Or try it in JavaScript:

```javascript
const response = await fetch('https://flashlearnai.witus.online/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fl_pub_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ topic: 'Basic Spanish Greetings' }),
});

const result = await response.json();
console.log(result.data.flashcards);
```

Or in Python:

```python
import requests

response = requests.post(
    'https://flashlearnai.witus.online/api/v1/generate',
    headers={
        'Authorization': 'Bearer fl_pub_YOUR_KEY',
        'Content-Type': 'application/json',
    },
    json={'topic': 'Basic Spanish Greetings'},
)

cards = response.json()['data']['flashcards']
for card in cards:
    print(f"Q: {card['front']}")
    print(f"A: {card['back']}")
    print()
```

---

## Try it yourself!

Generate flashcards on a topic you're studying right now. Try:
- A school subject like "Fractions" or "The Water Cycle"
- A hobby like "Chess Opening Moves" or "Guitar Chords"
- Something fun like "Fun Facts About Dogs"

---

## What's next?

In the next tutorial, you'll learn how to save and organize your flashcards into sets.

[Next: Save and Organize Your Flashcards →](./02-manage-your-sets.md)
