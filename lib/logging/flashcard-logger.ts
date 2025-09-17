/* eslint-disable @typescript-eslint/no-explicit-any */
// /src/app/api/flashcards/logger.ts
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { NextRequest } from "next/server";

// Wrapper for standard operational logging in the flashcard API context
export const apiLogger = {
  info: (message: string, request: NextRequest, metadata: any = {}) =>
    Logger.info(LogContext.FLASHCARD, message, { metadata, request }),

  warning: (message: string, request: NextRequest, metadata: any = {}) =>
    Logger.warning(LogContext.FLASHCARD, message, { metadata, request }),

  error: (message: string, request: NextRequest, metadata: any = {}) =>
    Logger.error(LogContext.FLASHCARD, message, { metadata, request }),
};

// Wrapper for analytics events related to flashcards
export const analytics = {
  trackSetSaved: (
    userId: string,
    properties: {
      source: string;
      totalCards: number;
      subsetsCreated: number;
      isPublic: boolean;
    },
    request: NextRequest
  ) =>
    AnalyticsLogger.trackEvent({
      userId,
      eventType: AnalyticsLogger.EventType.FLASHCARD_SET_SAVED,
      properties,
      request,
    }),
};
