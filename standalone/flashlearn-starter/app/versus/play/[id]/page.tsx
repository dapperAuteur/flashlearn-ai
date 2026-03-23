'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FlashcardDisplay from '@/components/FlashcardDisplay';
import { clientApi } from '@/lib/api';

interface Card { id: string; front: string; back: string }
interface Result { cardId: string; isCorrect: boolean; timeSeconds: number; confidenceRating: number }

export default function PlayChallengePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const start = async () => {
      try {
        const data = await clientApi<{ sessionId: string; flashcards: Card[] }>(
          'POST', `/versus/challenges/${id}/play`
        );
        setCards(data.flashcards);
        setSessionId(data.sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start');
      }
      setLoading(false);
    };
    start();
  }, [id]);

  const handleAnswer = async (isCorrect: boolean, confidenceRating: number, timeSeconds: number) => {
    const card = cards[currentIndex];
    const newResults = [...results, { cardId: card.id, isCorrect, timeSeconds, confidenceRating }];
    setResults(newResults);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Submit results and complete
      try {
        await clientApi('POST', `/study/sessions/${sessionId}/complete`, { results: newResults });
        await clientApi('POST', `/versus/challenges/${id}/complete`);
        router.push(`/versus/results/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete');
      }
    }
  };

  if (loading) return <p className="text-center py-12 text-gray-500">Starting challenge...</p>;
  if (error) return <p className="text-center py-12 text-red-600" role="alert">{error}</p>;

  const card = cards[currentIndex];

  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">Card {currentIndex + 1} of {cards.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 max-w-md mx-auto">
          <div className="h-1.5 rounded-full transition-all" style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
            backgroundColor: 'var(--color-secondary)',
          }} />
        </div>
      </div>

      <FlashcardDisplay key={card.id} front={card.front} back={card.back} onAnswer={handleAnswer} />
    </div>
  );
}
