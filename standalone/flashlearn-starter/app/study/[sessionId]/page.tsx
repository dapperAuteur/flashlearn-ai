'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FlashcardDisplay from '@/components/FlashcardDisplay';
import { clientApi } from '@/lib/api';

interface Card { id: string; front: string; back: string }
interface Result { cardId: string; isCorrect: boolean; timeSeconds: number; confidenceRating: number }

export default function StudySessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cards are passed via sessionStorage from the study page start action
    const stored = sessionStorage.getItem(`session_${sessionId}`);
    if (stored) {
      setCards(JSON.parse(stored));
      setLoading(false);
    } else {
      setError('Session not found. Go back to Study and start a new session.');
      setLoading(false);
    }
  }, [sessionId]);

  const handleAnswer = (isCorrect: boolean, confidenceRating: number, timeSeconds: number) => {
    const card = cards[currentIndex];
    const newResults = [...results, { cardId: card.id, isCorrect, timeSeconds, confidenceRating }];
    setResults(newResults);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete the session
      completeSession(newResults);
    }
  };

  const completeSession = async (allResults: Result[]) => {
    try {
      await clientApi('POST', `/study/sessions/${sessionId}/complete`, { results: allResults });
      sessionStorage.removeItem(`session_${sessionId}`);
      router.push(`/study/${sessionId}/complete?correct=${allResults.filter(r => r.isCorrect).length}&total=${allResults.length}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    }
  };

  if (loading) return <p className="text-center py-12 text-gray-500">Loading session...</p>;
  if (error) return <p className="text-center py-12 text-red-600" role="alert">{error}</p>;

  const card = cards[currentIndex];

  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">Card {currentIndex + 1} of {cards.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 max-w-md mx-auto">
          <div className="h-1.5 rounded-full transition-all" style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
            backgroundColor: 'var(--color-primary)',
          }} />
        </div>
      </div>

      <FlashcardDisplay
        key={card.id}
        front={card.front}
        back={card.back}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
