/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// A dedicated client-side logger for the Admin Dashboard.
export enum AdminLogContext {
  DASHBOARD = "admin-dashboard",
  LOG_VIEWER = "admin-log-viewer",
  USER_MANAGEMENT = "admin-user-management",
  SETTINGS = "admin-settings",
}

/**
 * Sends a log entry to the server.
 * This is primarily used for logging critical client-side errors to the backend.
 * @param level - The severity level of the log.
 * @param context - The area of the admin panel where the log originated.
 * @param message - The log message.
 * @param metadata - Additional data to include with the log.
 */
function sendLogToServer(level: 'info' | 'warn' | 'error', context: AdminLogContext, message: string, metadata: any = {}) {
  // Use navigator.sendBeacon if available for reliability on page unload.
  // Otherwise, fall back to fetch.
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify({ level, context, message, metadata })], { type: 'application/json' });
    navigator.sendBeacon('/api/admin/client-log', blob);
  } else {
    fetch('/api/admin/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, context, message, metadata }),
      keepalive: true, // Important for requests that might outlive the page
    }).catch(err => {
      // Fallback to console if the network request itself fails
      console.error("Failed to send log to server:", err);
    });
  }
}

export const adminLogger = {
  info(context: AdminLogContext, message: string, metadata: any = {}) {
    console.info(`[${context.toUpperCase()}] INFO: ${message}`, metadata);
    // Optionally send info logs to the server if needed for specific tracking.
    // sendLogToServer('info', context, message, metadata);
  },

  warn(context: AdminLogContext, message: string, metadata: any = {}) {
    console.warn(`[${context.toUpperCase()}] WARNING: ${message}`, metadata);
    // Send warnings to the server to track non-critical issues.
    sendLogToServer('warn', context, message, metadata);
  },

  error(context: AdminLogContext, message: string, error: any, metadata: any = {}) {
    const errorDetails = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
    const fullMetadata = { ...errorDetails, ...metadata };
    console.error(`[${context.toUpperCase()}] ERROR: ${message}`, fullMetadata);
    // Always send errors to the server for monitoring.
    sendLogToServer('error', context, message, fullMetadata);
  }
};
