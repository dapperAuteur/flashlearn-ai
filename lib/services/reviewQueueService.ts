// lib/services/reviewQueueService.ts

import { Flashcard } from '@/types/models';
import { SpacedRepetitionService } from './spacedRepetitionService';
import { Logger, LogContext } from '@/lib/logging/logger';

interface ReviewQueueConfig {
  maxNewCardsPerDay: number;
  maxReviewsPerDay: number;
}

interface ReviewQueue {
  newCards: Flashcard[];
  reviewCards: Flashcard[];
  totalDue: number;
}

export class ReviewQueueService {
  private static readonly DEFAULT_CONFIG: ReviewQueueConfig = {
    maxNewCardsPerDay: 20,
    maxReviewsPerDay: 100
  };
  
  /**
   * Build review queue for a user's study session
   */
  static async buildReviewQueue(
    allCards: Flashcard[],
    config: Partial<ReviewQueueConfig> = {}
  ): Promise<ReviewQueue> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    Logger.info(LogContext.STUDY, 'Building review queue', {
      totalCards: allCards.length,
      config: finalConfig
    });
    
    // Separate cards by type
    const newCards: Flashcard[] = [];
    const dueReviews: Flashcard[] = [];
    
    for (const card of allCards) {
      if (card.stage === 0) {
        newCards.push(card);
      } else if (SpacedRepetitionService.isDue(card)) {
        dueReviews.push(card);
      }
    }
    
    // Sort reviews by priority (most overdue first)
    dueReviews.sort((a, b) => {
      const priorityA = SpacedRepetitionService.getReviewPriority(a);
      const priorityB = SpacedRepetitionService.getReviewPriority(b);
      return priorityA - priorityB;
    });
    
    // Apply daily limits
    const limitedNewCards = newCards.slice(0, finalConfig.maxNewCardsPerDay);
    const limitedReviews = dueReviews.slice(0, finalConfig.maxReviewsPerDay);
    
    Logger.info(LogContext.STUDY, 'SERVICE:Review queue built', {
      newCardsAvailable: newCards.length,
      newCardsIncluded: limitedNewCards.length,
      reviewsDue: dueReviews.length,
      reviewsIncluded: limitedReviews.length
    });
    
    return {
      newCards: limitedNewCards,
      reviewCards: limitedReviews,
      totalDue: limitedNewCards.length + limitedReviews.length
    };
  }
  
  /**
   * Interleave new cards with reviews for better learning
   */
  static interleaveCards(queue: ReviewQueue): Flashcard[] {
    const { newCards, reviewCards } = queue;
    const result: Flashcard[] = [];
    
    // Start with reviews, insert new cards every 3-4 reviews
    let reviewIndex = 0;
    let newIndex = 0;
    let insertNewCardCounter = 0;
    
    while (reviewIndex < reviewCards.length || newIndex < newCards.length) {
      // Add reviews
      if (reviewIndex < reviewCards.length && insertNewCardCounter < 3) {
        result.push(reviewCards[reviewIndex]);
        reviewIndex++;
        insertNewCardCounter++;
      }
      // Add a new card
      else if (newIndex < newCards.length) {
        result.push(newCards[newIndex]);
        newIndex++;
        insertNewCardCounter = 0;
      }
      // Only reviews left
      else if (reviewIndex < reviewCards.length) {
        result.push(reviewCards[reviewIndex]);
        reviewIndex++;
      }
    }
    
    return result;
  }
}