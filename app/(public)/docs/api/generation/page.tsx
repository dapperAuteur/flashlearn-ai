import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Flashcard Generation API',
  description: 'Generate AI-powered flashcards from any topic with the FlashLearn API. Supports batch generation, set CRUD, public set browsing, and categories.',
  openGraph: {
    title: 'FlashLearn AI Flashcard Generation API Guide',
    description: 'Generate flashcards with one API call. Node.js and Python examples included.',
  },
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed" role="region" aria-label={`${lang} code example`}>
      <code>{code}</code>
    </pre>
  );
}

export default function GenerationGuidePage() {
  return (
    <article className="prose prose-gray max-w-none prose-headings:scroll-mt-20">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Flashcard Generation</h1>
      <p className="text-base sm:text-lg text-gray-600 mb-8">
        Generate flashcards from any topic, manage sets, and browse public content.
      </p>

      <section aria-labelledby="generate">
        <h2 id="generate" className="text-xl font-semibold text-gray-900 mt-8 mb-4">Generate from a Topic</h2>
        <Code lang="bash" code={`curl -X POST https://flashlearn.ai/api/v1/generate \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"topic": "Photosynthesis", "title": "Bio: Photosynthesis"}'`} />
        <p className="text-gray-600 mt-3">Returns 5-20 flashcards. If a matching public set exists, returns that instead (saving your generation quota). The <code className="bg-gray-100 px-1 rounded text-xs">source</code> field is <code className="bg-gray-100 px-1 rounded text-xs">&quot;generated&quot;</code> or <code className="bg-gray-100 px-1 rounded text-xs">&quot;shared&quot;</code>.</p>
      </section>

      <section aria-labelledby="batch">
        <h2 id="batch" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Batch Generation <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">Pro / Enterprise</span></h2>
        <Code lang="bash" code={`curl -X POST https://flashlearn.ai/api/v1/generate/batch \\
  -H "Authorization: Bearer fl_pub_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topics": [
      {"topic": "Cell Biology", "title": "Unit 1"},
      {"topic": "Genetics", "title": "Unit 2"},
      {"topic": "Evolution", "title": "Unit 3"}
    ]
  }'`} />
        <p className="text-gray-600 mt-3">Max 10 topics per request. Each creates a separate set. Returns per-topic status with cards.</p>
      </section>

      <section aria-labelledby="crud">
        <h2 id="crud" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Manage Sets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" role="table">
            <thead><tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold text-gray-700" scope="col">Endpoint</th>
              <th className="pb-2 font-semibold text-gray-700" scope="col">Description</th>
            </tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /api/v1/sets</td><td className="py-2">List your sets (paginated, filterable by source)</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">POST /api/v1/sets</td><td className="py-2">Create a set with manual flashcards</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /api/v1/sets/:id</td><td className="py-2">Get set with all cards</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">PATCH /api/v1/sets/:id</td><td className="py-2">Update title, description, cards</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">DELETE /api/v1/sets/:id</td><td className="py-2">Delete a set</td></tr>
              <tr className="border-b"><td className="py-2 pr-4 font-mono text-xs">GET /api/v1/sets/explore</td><td className="py-2">Browse public sets (search, sort, category filter)</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">GET /api/v1/categories</td><td className="py-2">List all categories</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="node-example">
        <h2 id="node-example" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Node.js Example</h2>
        <Code lang="javascript" code={`const response = await fetch('https://flashlearn.ai/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.FLASHLEARN_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'JavaScript Promises and async/await',
    title: 'JS Async Patterns',
  }),
});

const { data } = await response.json();
console.log(\`Generated \${data.cardCount} cards (set: \${data.setId})\`);`} />
      </section>

      <section aria-labelledby="python-example">
        <h2 id="python-example" className="text-xl font-semibold text-gray-900 mt-10 mb-4">Python Example</h2>
        <Code lang="python" code={`import requests

response = requests.post(
    'https://flashlearn.ai/api/v1/generate',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    },
    json={'topic': 'Python decorators', 'title': 'Advanced Python'},
)

data = response.json()['data']
print(f"Generated {data['cardCount']} cards")`} />
      </section>

      <nav aria-label="Next guides" className="mt-12 flex flex-col sm:flex-row gap-4">
        <Link href="/docs/api/spaced-repetition" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Next: Spaced Repetition</span>
          <span className="block text-xs text-gray-500 mt-1">Build a study app with SM-2 scheduling</span>
        </Link>
        <Link href="/docs/api/versus-mode" className="flex-1 block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 border transition-colors">
          <span className="font-semibold text-gray-900 text-sm">Next: Versus Mode</span>
          <span className="block text-xs text-gray-500 mt-1">Build competitive quizzes</span>
        </Link>
      </nav>
    </article>
  );
}
