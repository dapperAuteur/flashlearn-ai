# Guide: Flashcard Generation API

This guide covers generating flashcards, managing sets, and browsing public content.

---

## Generate Flashcards from a Topic

```bash
POST /api/v1/generate
```

```json
{
  "topic": "Photosynthesis in plants",
  "title": "Biology: Photosynthesis",
  "description": "Review cards for Chapter 5"
}
```

Only `topic` is required. `title` defaults to the topic text. `description` is optional.

The API generates 5-20 flashcards using AI and creates a persistent flashcard set. If a matching public set already exists, it returns that instead (saving your generation quota).

**Response:**
```json
{
  "data": {
    "flashcards": [
      { "front": "What is the primary pigment?", "back": "Chlorophyll a" },
      { "front": "Where do light reactions occur?", "back": "Thylakoid membranes" }
    ],
    "setId": "665f1a2b3c4d5e6f7a8b9c0d",
    "source": "generated",
    "cardCount": 10
  }
}
```

The `source` field is `"generated"` for new AI-created sets or `"shared"` when returning an existing public set.

---

## Batch Generation (Pro/Enterprise)

Generate multiple topics in one request:

```bash
POST /api/v1/generate/batch
```

```json
{
  "topics": [
    { "topic": "Cell Biology", "title": "Bio Unit 1" },
    { "topic": "Genetics", "title": "Bio Unit 2" },
    { "topic": "Evolution", "title": "Bio Unit 3" }
  ]
}
```

Maximum 10 topics per request. Each topic creates a separate flashcard set.

**Response:**
```json
{
  "data": {
    "results": [
      { "topic": "Cell Biology", "status": "success", "setId": "...", "cardCount": 12, "flashcards": [...] },
      { "topic": "Genetics", "status": "success", "setId": "...", "cardCount": 10, "flashcards": [...] },
      { "topic": "Evolution", "status": "failed", "error": "AI generation failed." }
    ],
    "summary": { "total": 3, "succeeded": 2, "failed": 1 }
  }
}
```

---

## Create a Flashcard Set Manually

```bash
POST /api/v1/sets
```

```json
{
  "title": "Spanish Vocabulary - Unit 1",
  "description": "Basic greetings and introductions",
  "isPublic": true,
  "flashcards": [
    { "front": "Hello", "back": "Hola" },
    { "front": "Goodbye", "back": "Adiós" },
    { "front": "Please", "back": "Por favor" }
  ]
}
```

---

## List Your Sets

```bash
GET /api/v1/sets?page=1&limit=20&source=Prompt
```

Filter by `source`: `Prompt`, `PDF`, `YouTube`, `Audio`, `Image`, `CSV`.

---

## Get a Set with All Cards

```bash
GET /api/v1/sets/{setId}
```

Returns the full set including every flashcard with its ID.

---

## Update a Set

```bash
PATCH /api/v1/sets/{setId}
```

```json
{
  "title": "Updated Title",
  "flashcards": [
    { "front": "New question", "back": "New answer" }
  ]
}
```

Any field is optional. If you provide `flashcards`, the entire card list is replaced.

---

## Delete a Set

```bash
DELETE /api/v1/sets/{setId}
```

---

## Browse Public Sets

```bash
GET /api/v1/sets/explore?search=biology&sort=popular&page=1&limit=20
```

| Parameter | Values | Default |
|-----------|--------|---------|
| `search` | Text search in title/description | — |
| `category` | Filter by category ID | — |
| `sort` | `recent` or `popular` | `recent` |
| `page` | Page number | 1 |
| `limit` | Items per page (max 50) | 20 |

---

## List Categories

```bash
GET /api/v1/categories
```

Returns all available categories (name, slug, description) for filtering sets.

---

## Check Your Usage

```bash
GET /api/v1/usage
```

Returns your current billing period usage, limits, and tier:

```json
{
  "data": {
    "keyType": "public",
    "apiTier": "Free",
    "period": { "start": "2026-03-01T00:00:00.000Z", "end": "2026-04-01T00:00:00.000Z" },
    "usage": { "apiCalls": 42, "generationCalls": 7, "overageCalls": 0 },
    "limits": { "burstPerMinute": 10, "monthlyGenerations": 100, "monthlyApiCalls": 1000 }
  }
}
```

---

## Example: Node.js Wrapper

```javascript
class FlashLearnAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://flashlearn.ai/api/v1';
  }

  async request(method, path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'API error');
    return json.data;
  }

  generate(topic, title) { return this.request('POST', '/generate', { topic, title }); }
  listSets(page = 1) { return this.request('GET', `/sets?page=${page}`); }
  getSet(id) { return this.request('GET', `/sets/${id}`); }
  createSet(data) { return this.request('POST', '/sets', data); }
  explore(search) { return this.request('GET', `/sets/explore?search=${encodeURIComponent(search)}`); }
  usage() { return this.request('GET', '/usage'); }
}

// Usage
const fl = new FlashLearnAPI('fl_pub_your_key');
const cards = await fl.generate('JavaScript closures');
console.log(`Generated ${cards.cardCount} cards`);
```

---

## Example: Python Wrapper

```python
import requests

class FlashLearnAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://flashlearn.ai/api/v1'
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

    def _request(self, method, path, json=None):
        res = requests.request(method, f'{self.base_url}{path}', headers=self.headers, json=json)
        data = res.json()
        if not res.ok:
            raise Exception(data.get('error', {}).get('message', 'API error'))
        return data['data']

    def generate(self, topic, title=None):
        return self._request('POST', '/generate', {'topic': topic, 'title': title})

    def list_sets(self, page=1):
        return self._request('GET', f'/sets?page={page}')

    def get_set(self, set_id):
        return self._request('GET', f'/sets/{set_id}')

    def explore(self, search=''):
        return self._request('GET', f'/sets/explore?search={search}')

    def usage(self):
        return self._request('GET', '/usage')


# Usage
fl = FlashLearnAPI('fl_pub_your_key')
cards = fl.generate('Python decorators')
print(f"Generated {cards['cardCount']} cards")
```
