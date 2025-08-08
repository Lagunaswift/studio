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

// Error Boundary Component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitoring.captureException(error, {
      errorInfo,
      component: 'ErrorBoundary'
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
