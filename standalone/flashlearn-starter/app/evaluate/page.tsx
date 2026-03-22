'use client';

import { useState } from 'react';
import { clientApi } from '@/lib/api';

export default function EvaluatePage() {
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ isCorrect: boolean; similarity: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const evaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !correctAnswer.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await clientApi<{ isCorrect: boolean; similarity: number; feedback: string }>(
        'POST', '/study/evaluate-answer',
        { userAnswer: userAnswer.trim(), correctAnswer: correctAnswer.trim(), question: question.trim() || undefined }
      );
      setResult(data);
    } catch { setResult(null); }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Answer Evaluator</h1>
      <p className="text-sm text-gray-500 mb-6">Check if a typed answer is correct — handles typos, synonyms, and different wordings.</p>

      <form onSubmit={evaluate} className="max-w-xl space-y-4 mb-8">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">Question (optional)</label>
          <input id="question" type="text" value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="What organelle produces ATP?" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
          <input id="correctAnswer" type="text" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
            placeholder="Mitochondria" required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="userAnswer" className="block text-sm font-medium text-gray-700 mb-1">Student Answer</label>
          <input id="userAnswer" type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
            placeholder="mitocondria" required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          {loading ? 'Checking...' : 'Check Answer'}
        </button>
      </form>

      {result && (
        <div className={`max-w-xl p-5 rounded-lg border ${result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          role="alert">
          <p className={`text-lg font-bold ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {result.isCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          <p className="text-sm text-gray-600 mt-1">Similarity: {Math.round(result.similarity * 100)}%</p>
          <p className="text-sm text-gray-600 mt-1">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}
