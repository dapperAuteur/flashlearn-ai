/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/logging/component-logger.ts
'use client';

import { useEffect } from 'react';

/**
 * Enum for different logging contexts within UI components.
 */
export enum LogContext {
  COMPONENT = "component",
  HOOK = "hook",
  UI = "ui",
}

/**
 * A simple client-side logger for React components and hooks.
 * It logs messages to the console with a standardized format.
 */
export const componentLogger = {
  log(context: LogContext, message: string, metadata: any = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${context.toUpperCase()}] ${message}`, metadata);
    }
  },

  error(context: LogContext, message: string, error: any, metadata: any = {}) {
    console.error(`[${context.toUpperCase()}] ERROR: ${message}`, {
      error,
      ...metadata,
    });
    // In a real-world scenario, you might send this error to a monitoring service
  },
};

/**
 * Hook to log when a component mounts and unmounts.
 * @param componentName - The name of the component to log.
 */
export const useComponentLifecycleLogger = (componentName: string) => {
  useEffect(() => {
    componentLogger.log(LogContext.COMPONENT, `${componentName} mounted.`);
    return () => {
      componentLogger.log(LogContext.COMPONENT, `${componentName} unmounted.`);
    };
  }, [componentName]);
};
