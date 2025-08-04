/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A lightweight logger specifically for use in Next.js Edge Runtime environments (like middleware).
 * This logger ONLY outputs to the console and has NO server-side dependencies (like database connections).
 * It is safe to use in `middleware.ts`.
 */

export enum EdgeLogContext {
  AUTH = "auth",
  MIDDLEWARE = "middleware",
}

export const edgeLogger = {
  info(context: EdgeLogContext, message: string, metadata: any = {}) {
    const logObject = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        context,
        message,
        ...metadata
    };
    console.info(JSON.stringify(logObject));
  },

  warn(context: EdgeLogContext, message: string, metadata: any = {}) {
    const logObject = {
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        context,
        message,
        ...metadata
    };
    console.warn(JSON.stringify(logObject));
  },

  error(context: EdgeLogContext, message: string, metadata: any = {}) {
    const logObject = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        context,
        message,
        ...metadata
    };
    console.error(JSON.stringify(logObject));
  }
};
