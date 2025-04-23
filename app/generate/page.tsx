'use client';

import { useState } from "react";

interface Flashcard {
  term: string;
  definition: string;
}

export default function GenerateFlashcardsPage(){
  
  const [topic, setTopic] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flippedCardIndices, setFlippedCardIndices] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if(!topic.trim()) {
      setError('Please enter a topic or some terms and definitions.');
      setFlashcards([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    setFlashcards([]); // Clear previous cards
    setFlippedCardIndices(new Set()); // Reset flipped state

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (response.ok) {

        if (data.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
        } else {
           setError(data.error || 'No flashcards were generated. Try refining your topic.');
        }
      }
    } catch (error: unknown) {
      console.error("Generation failed:", error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
      
    }

    const toggleFlip = (index: number) => {
      setFlippedCardIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    };

    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl"> {/* Use Tailwind container */}
      <h1 className="text-3xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400"> {/* Tailwind styling */}
        AI Flashcard Generator
      </h1>
      <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
        Enter a topic or specific "Term: Definition" pairs (one per line) to generate flashcards instantly using AI. No sign-in required!
      </p>

      <textarea
        id="topicInput"
        className="w-full p-3 border border-gray-300 rounded-md mb-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white" // Tailwind styling
        placeholder="e.g., Photosynthesis, Capital cities of Europe, useState Hook: React state management..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        disabled={isLoading}
      />

      <div className="text-center mb-6">
         <button
           id="generateButton"
           className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out" // Tailwind styling
           onClick={handleGenerate}
           disabled={isLoading}
         >
           {isLoading ? 'Generating...' : 'Generate Flashcards'}
         </button>
      </div>


      {error && (
        <div id="errorMessage" className="text-red-600 dark:text-red-400 text-center my-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Flashcard Display Area - Adapt styling from gemini-flashcard-maker/index.css using Tailwind */}
      <div id="flashcardsContainer" className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 perspective"> {/* Tailwind grid layout */}
        {flashcards.map((card, index) => (
          <div
            key={index}
            className={`flashcard cursor-pointer h-40 rounded-lg shadow-md ${flippedCardIndices.has(index) ? 'flipped' : ''}`} // Basic structure, needs flip styles
            onClick={() => toggleFlip(index)}
          >
            <div className="flashcard-inner relative w-full h-full text-center transition-transform duration-700 transform-style-preserve-3d">
               {/* Front */}
               <div className="flashcard-front absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="term font-semibold text-lg text-blue-900 dark:text-blue-100">{card.term}</div>
               </div>
               {/* Back */}
               <div className="flashcard-back absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg transform rotate-y-180">
                  <div className="definition text-sm text-green-900 dark:text-green-100">{card.definition}</div>
               </div>
            </div>
          </div>
        ))}
      </div>
       {/* Add CSS for the flip animation (e.g., in your global.css) */}
       {/*
          .perspective { perspective: 1000px; }
          .transform-style-preserve-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
          .flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
       */}
    </div>
  );


}
