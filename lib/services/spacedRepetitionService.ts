// lib/services/spacedRepetitionService.ts

import { Flashcard } from '@/types/models';
import { Logger, LogContext } from '@/lib/logging/logger';

interface ReviewRating {
  quality: 0 | 1 | 2 | 3; // 0=wrong, 1=hard, 2=good, 3=easy
  timeSpent: number; // milliseconds
}

interface ReviewResult {
  nextReviewDate: Date;
  interval: number; // days
  easeFactor: number;
  stage: number;
}

export class SpacedRepetitionService {
  // Default ease factor for new cards
  private static readonly DEFAULT_EASE_FACTOR = 2.5;
  
  // Minimum ease factor to prevent cards becoming too difficult
  private static readonly MIN_EASE_FACTOR = 1.3;
  
  // Initial intervals in days
  private static readonly INITIAL_INTERVALS = [1, 3, 7];
  
  /**
   * Calculate next review date based on SM-2 algorithm
   */
  static calculateNextReview(
    card: Flashcard,
    rating: ReviewRating
  ): ReviewResult {
    Logger.debug(LogContext.FLASHCARD, `Calculating next review for card ${card._id}`, {
      currentStage: card.stage,
      rating: rating.quality
    });
    
    let interval: number;
    let easeFactor = this.getEaseFactor(card);
    let stage = card.stage;
    
    // Handle wrong answer - reset to beginning
    if (rating.quality === 0) {
      interval = 1;
      stage = 1; // Move to learning stage
      easeFactor = Math.max(easeFactor - 0.2, this.MIN_EASE_FACTOR);
      
      Logger.info(LogContext.FLASHCARD, `Card answered incorrectly, resetting interval`, {
        cardId: card._id,
        newInterval: interval
      });
    } 
    // New card or learning stage
    else if (stage === 0 || stage === 1) {
      const stepIndex = card.correctCount >= this.INITIAL_INTERVALS.length 
        ? this.INITIAL_INTERVALS.length - 1 
        : card.correctCount;
        
      interval = this.INITIAL_INTERVALS[stepIndex];
      
      // Graduate to review stage after initial intervals
      if (card.correctCount >= this.INITIAL_INTERVALS.length - 1) {
        stage = 2;
      }
    }
    // Review stage
    else {
      const previousInterval = this.getPreviousInterval(card);
      
      // Adjust ease factor based on rating
      easeFactor = this.adjustEaseFactor(easeFactor, rating.quality);
      
      // Calculate new interval
      switch (rating.quality) {
        case 1: // Hard
          interval = Math.round(previousInterval * 0.6);
          break;
        case 2: // Good
          interval = Math.round(previousInterval * easeFactor);
          break;
        case 3: // Easy
          interval = Math.round(previousInterval * easeFactor * 1.3);
          break;
        default:
          interval = previousInterval;
      }
      
      // Ensure minimum interval
      interval = Math.max(1, interval);
      
      // Check for mastery (90+ day interval)
      if (interval >= 90) {
        stage = 3;
      }
    }
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    
    Logger.info(LogContext.FLASHCARD, `Next review calculated`, {
      cardId: card._id,
      interval,
      nextReviewDate,
      easeFactor,
      stage
    });
    
    return {
      nextReviewDate,
      interval,
      easeFactor,
      stage
    };
  }
  
  /**
   * Get ease factor from card metadata or use default
   */
  private static getEaseFactor(card: Flashcard): number {
    // Store ease factor in metadata if your model supports it
    // For now, calculate based on performance
    const totalAttempts = card.correctCount + card.incorrectCount;
    if (totalAttempts === 0) return this.DEFAULT_EASE_FACTOR;
    
    const successRate = card.correctCount / totalAttempts;
    return Math.max(
      this.MIN_EASE_FACTOR,
      this.DEFAULT_EASE_FACTOR * successRate
    );
  }
  
  /**
   * Calculate previous interval from last review dates
   */
  private static getPreviousInterval(card: Flashcard): number {
    if (!card.lastReviewed || !card.nextReviewDate) {
      return 1;
    }
    
    const lastReview = new Date(card.lastReviewed);
    const nextReview = new Date(card.nextReviewDate);
    const diffDays = Math.round((nextReview.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays);
  }
  
  /**
   * Adjust ease factor based on answer quality
   */
  private static adjustEaseFactor(currentEase: number, quality: number): number {
    let newEase = currentEase;
    
    switch (quality) {
      case 1: // Hard
        newEase -= 0.15;
        break;
      case 2: // Good
        // No change
        break;
      case 3: // Easy
        newEase += 0.15;
        break;
    }
    
    return Math.max(this.MIN_EASE_FACTOR, newEase);
  }
  
  /**
   * Determine if a card is due for review
   */
  static isDue(card: Flashcard): boolean {
    if (!card.nextReviewDate) return true; // New card
    
    const now = new Date();
    const reviewDate = new Date(card.nextReviewDate);
    
    return reviewDate <= now;
  }
  
  /**
   * Calculate review priority (lower number = higher priority)
   */
  static getReviewPriority(card: Flashcard): number {
    if (!card.nextReviewDate) return 0; // New cards highest priority
    
    const now = new Date();
    const reviewDate = new Date(card.nextReviewDate);
    const daysOverdue = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Negative means not due yet, positive means overdue
    return -daysOverdue;
  }
}