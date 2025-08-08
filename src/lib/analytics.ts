declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

class AnalyticsService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Load Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
    document.head.appendChild(script);

    window.gtag = window.gtag || function() {
      (window.gtag as any).q = (window.gtag as any).q || [];
      (window.gtag as any).q.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      page_title: document.title,
      page_location: window.location.href
    });

    this.initialized = true;
  }

  // Track events
  track(event: string, properties?: Record<string, any>) {
    if (!this.initialized || !window.gtag) return;

    window.gtag('event', event, {
      event_category: properties?.category || 'User Action',
      event_label: properties?.label,
      value: properties?.value,
      ...properties
    });

    console.log('📊 Analytics:', event, properties);
  }

  // Track page views
  pageView(path: string, title?: string) {
    if (!this.initialized || !window.gtag) return;

    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      page_path: path,
      page_title: title || document.title
    });
  }

  // Track user flows
  trackUserFlow(step: string, flowName: string, metadata?: Record<string, any>) {
    this.track('user_flow_step', {
      category: 'User Flow',
      label: flowName,
      flow_step: step,
      ...metadata
    });
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, category = 'Performance') {
    this.track('performance_metric', {
      category,
      metric_name: metric,
      value: Math.round(value),
      non_interaction: true
    });
  }

  // Track business metrics
  trackMealPlanned(mealType: string, recipeId: string) {
    this.track('meal_planned', {
      category: 'Meal Planning',
      meal_type: mealType,
      recipe_id: recipeId
    });
  }

  trackRecipeViewed(recipeId: string, source: string) {
    this.track('recipe_viewed', {
      category: 'Recipe Engagement',
      recipe_id: recipeId,
      source
    });
  }

  trackFeatureUsed(feature: string, context?: string) {
    this.track('feature_used', {
      category: 'Feature Usage',
      feature_name: feature,
      context
    });
  }

  // Track conversion events
  trackConversion(action: string, value?: number) {
    this.track('conversion', {
      category: 'Conversion',
      action,
      value
    });
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    if (!this.initialized || !window.gtag) return;

    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      user_properties: properties
    });
  }
}

export const analytics = new AnalyticsService();

// React hook for analytics
export function useAnalytics() {
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    analytics.track(event, properties);
  };

  const trackPageView = (path: string, title?: string) => {
    analytics.pageView(path, title);
  };

  return {
    trackEvent,
    trackPageView,
    trackUserFlow: analytics.trackUserFlow.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackMealPlanned: analytics.trackMealPlanned.bind(analytics),
    trackRecipeViewed: analytics.trackRecipeViewed.bind(analytics),
    trackFeatureUsed: analytics.trackFeatureUsed.bind(analytics)
  };
}
