import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * Shuffles an array and returns a new shuffled array using the
 * Fisher-Yates (aka Knuth) shuffle algorithm. This is an unbiased
 * and efficient shuffle algorithm.
 *
 * @template T The type of the elements in the array.
 * @param {T[]} array The array to be shuffled.
 * @returns {T[]} A new array containing the shuffled elements.
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
  // We create a copy to ensure the original array is not mutated,
  // which is a best practice for functional programming and state management in React.
  const newArray = [...array];
  let currentIndex = newArray.length;
  let randomIndex;

  Logger.log(LogContext.UTILS, `Shuffling array with ${currentIndex} items.`);

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element using destructuring assignment.
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex],
      newArray[currentIndex],
    ];
  }

  return newArray;
};