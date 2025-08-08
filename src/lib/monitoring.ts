import * as Sentry from '@sentry/nextjs';
import React from 'react';

class ErrorMonitoring {
  constructor() {
    this.initializeSentry();
  }

  private initializeSentry() {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      beforeSend(event) {
        // Filter out known non-critical errors
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.value?.includes('Non-Error promise rejection')) {
            return null;
          }
        }
        return event;
      }
    });
  }

  captureException(error: Error, context?: Record<string, any>) {
    console.error('🚨 Error captured:', error);
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: context?.component || 'unknown'
      }
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    Sentry.captureMessage(message, level as any);
  }

  setUserContext(user: { id: string; email?: string }) {
    Sentry.setUser(user);
  }

  addBreadcrumb(message: string, category: string = 'user') {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info'
    });
  }
}

export const errorMonitoring = new ErrorMonitoring();