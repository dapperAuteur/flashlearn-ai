'use client';

import { useState } from "react";

interface RatingStarsProps {
  setId: string;
  initialRating?: number;
  totalRatings?: number;
  onRatingSubmitted?: (newRating: number) => void;
}

export default function RatingStars({ 
  setId, 
  initialRating = 0, 
  totalRatings = 0,
  onRatingSubmitted
}: RatingStarsProps) {
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submittedRating, setSubmittedRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleRatingSubmit = async (newRating: number) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/flashcards/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setId, rating: newRating }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit rating');
      }
      
      setSubmittedRating(newRating);
      if (onRatingSubmitted) {
        onRatingSubmitted(newRating);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center mt-4">
      <div className="flex items-center mb-1">
        {submittedRating > 0 ? (
          <p className="text-sm text-gray-600">
            Thanks for your feedback! You rated this {submittedRating} out of 5.
          </p>
        ) : (
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`h-8 w-8 mx-1 flex items-center justify-center text-xl ${
                  (hoveredRating || submittedRating) >= star
                    ? 'text-yellow-500'
                    : 'text-gray-300'
                }`}
                onClick={() => {
                  if (!isSubmitting) {
                    handleRatingSubmit(star);
                  }
                }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                disabled={isSubmitting}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {!isSubmitting ? 'Rate these flashcards' : 'Submitting...'}
            </span>
          </div>
        )}
      </div>
      
      {initialRating > 0 && (
        <p className="text-xs text-gray-500">
          Rated {initialRating.toFixed(1)} by {totalRatings} users
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}