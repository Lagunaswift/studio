import { getCLS, getFID, getFCP, getLCP, getTTFB, type Metric } from 'web-vitals';

interface PerformanceMetrics {
  CLS: number;
  FID: number;
  FCP: number;
  LCP: number;
  TTFB: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  
  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));
  }

  private handleMetric(metric: Metric) {
    this.metrics[metric.name as keyof PerformanceMetrics] = metric.value;
    
    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true
      });
    }

    // Log poor performance
    this.checkPerformanceThresholds(metric);
  }

  private checkPerformanceThresholds(metric: Metric) {
    const thresholds = {
      CLS: 0.1,
      FID: 100,
      FCP: 1800,
      LCP: 2500,
      TTFB: 600
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (metric.value > threshold) {
      console.warn(`⚠️ Poor ${metric.name} performance:`, {
        value: metric.value,
        threshold,
        rating: metric.rating
      });
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
export function usePerformanceMetrics() {
  return performanceMonitor.getMetrics();
}
