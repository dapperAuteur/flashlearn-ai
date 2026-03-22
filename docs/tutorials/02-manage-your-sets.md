# Tutorial 2: Save and Organize Your Flashcards

## What you'll learn

- How to create a flashcard set by hand (without AI)
- How to see all your sets
- How to update and delete sets
- How to browse flashcards other people made

## What you need

- Your API key from Tutorial 1
- A terminal or code editor

---

## Step 1: Create a set by hand

Sometimes you want to type your own flashcards instead of using AI. Here's how:

```bash
curl -X POST https://flashlearnai.witus.online/api/v1/sets \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Math Facts",
    "description": "Multiplication tables I need to memorize",
    "flashcards": [
      { "front": "7 x 8", "back": "56" },
      { "front": "6 x 9", "back": "54" },
      { "front": "12 x 12", "back": "144" }
    ]
  }'
```

### What happened?

You created a set called "My Math Facts" with 3 cards. The API saved it and gave you back an `id` for the set. Save that ID — you'll need it.

---

## Step 2: See all your sets

```bash
curl https://flashlearnai.witus.online/api/v1/sets \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

This gives you a list of every set you've made. Each one shows the title, how many cards it has, and when you made it.

```json
{
  "data": {
    "sets": [
      {
        "id": "abc123",
        "title": "My Math Facts",
        "cardCount": 3,
        "createdAt": "2026-03-22T10:00:00Z"
      },
      {
        "id": "def456",
        "title": "The Solar System",
        "cardCount": 10,
        "createdAt": "2026-03-22T09:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
  }
}
```

---

## Step 3: Look at one set

Use the set ID to see all the cards inside it:

```bash
curl https://flashlearnai.witus.online/api/v1/sets/abc123 \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

Replace `abc123` with your actual set ID.

---

## Step 4: Update a set

Want to change the title or add more cards? Use PATCH:

```bash
curl -X PATCH https://flashlearnai.witus.online/api/v1/sets/abc123 \
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Math Facts (Updated)",
    "flashcards": [
      { "front": "7 x 8", "back": "56" },
      { "front": "6 x 9", "back": "54" },
      { "front": "12 x 12", "back": "144" },
      { "front": "11 x 11", "back": "121" }
    ]
  }'
```

**Important:** When you update flashcards, you send the WHOLE list. The old cards are replaced with the new ones.

---

## Step 5: Delete a set

Don't need a set anymore? Delete it:

```bash
curl -X DELETE https://flashlearnai.witus.online/api/v1/sets/abc123 \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

This is permanent. Once deleted, it's gone.

---

## Step 6: Browse flashcards other people made

You can explore public sets made by other people:

```bash
curl "https://flashlearnai.witus.online/api/v1/sets/explore?search=biology&sort=popular" \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

This searches for public sets about biology and sorts them by how many people use them.

You can also see what categories are available:

```bash
curl https://flashlearnai.witus.online/api/v1/categories \
  -H "Authorization: Bearer fl_pub_YOUR_KEY"
```

---

## Try it yourself!

1. Create a set with flashcards for something you're learning
2. List your sets to see it
3. Add one more card to it using PATCH
4. Search for public sets on a topic you like

---

## What's next?

Now that you have flashcards, let's learn how to study them the smart way — with spaced repetition!

[Next: Study Smarter with Spaced Repetition →](./03-study-with-spaced-repetition.md)
