/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/logging/layout-logger.ts
'use client';

/**
 * @file Client-side logger specifically for layout-related events.
 * @version 1.0.0
 * @see /src/lib/logging/client-logger.ts for the general client logger.
 */

// Enum to define specific contexts for logging, ensuring consistency.
export enum LogContext {
  LAYOUT = 'layout',
  SIDEBAR = 'sidebar',
  HEADER = 'header',
}

/**
 * A simple, client-side logger focused on capturing UI and layout events.
 * This helps in debugging UI interactions and performance without sending excessive data to the server.
 */
export const LayoutLogger = {
  /**
   * Logs a standard informational message.
   * @param {LogContext} context - The specific area of the layout the log is coming from (e.g., 'sidebar').
   * @param {string} message - The descriptive log message.
   * @param {Record<string, any>} [metadata={}] - Optional object for additional structured data.
   */
  log(context: LogContext, message: string, metadata: Record<string, any> = {}): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LAYOUT][${context.toUpperCase()}] ${message}`, metadata);
    }
  },

  /**
   * Logs an error message.
   * @param {LogContext} context - The specific area of the layout where the error occurred.
   * @param {string} message - The descriptive error message.
   * @param {Record<string, any>} [metadata={}] - Optional object for additional context, like component state.
   */
  error(context: LogContext, message: string, metadata: Record<string, any> = {}): void {
    console.error(`[LAYOUT][${context.toUpperCase()}] ERROR: ${message}`, metadata);
    // In a production environment, this could be expanded to send critical layout errors
    // to a dedicated monitoring service (e.g., Sentry, LogRocket).
  },
};
