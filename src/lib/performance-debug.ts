import React from 'react';

class PerformanceDebugger {
  private static instance: PerformanceDebugger;
  private measurements: Map<string, number> = new Map();

  static getInstance(): PerformanceDebugger {
    if (!PerformanceDebugger.instance) {
      PerformanceDebugger.instance = new PerformanceDebugger();
    }
    return PerformanceDebugger.instance;
  }

  startMeasurement(name: string) {
    this.measurements.set(name, performance.now());
    performance.mark(`${name}-start`);
  }

  endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    this.measurements.delete(name);

    if (duration > 100) { // Log slow operations
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => {
      this.endMeasurement(name);
    });
  }

  measureSync<T>(name: string, fn: () => T): T {
    this.startMeasurement(name);
    try {
      return fn();
    } finally {
      this.endMeasurement(name);
    }
  }

  getPerformanceEntries(name?: string): PerformanceEntry[] {
    if (name) {
      return performance.getEntriesByName(name);
    }
    return performance.getEntriesByType('measure');
  }

  clearMeasurements() {
    performance.clearMeasures();
    performance.clearMarks();
    this.measurements.clear();
  }
}

export const perfDebugger = PerformanceDebugger.getInstance();

// React Hook for component performance measurement
export function usePerformanceMeasurement(componentName: string) {
  React.useEffect(() => {
    perfDebugger.startMeasurement(`${componentName}-render`);
    return () => {
      perfDebugger.endMeasurement(`${componentName}-render`);
    };
  }, [componentName]);
}
