// src/lib/stripe.ts
import { Stripe, loadStripe } from '@stripe/stripe-js';

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('Stripe publishable key is missing. Please configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      stripePromise = Promise.resolve(null);
      return stripePromise;
    }
    
    // Load Stripe with better error handling
    stripePromise = loadStripe(publishableKey).catch((error) => {
      console.error('Failed to load Stripe.js:', error);
      return null;
    });
  }
  return stripePromise;
};

// Price IDs for different subscription tiers
export const STRIPE_PRICE_IDS = {
  premium_monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly_placeholder',
  premium_yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly_placeholder',
} as const;

export type StripePriceId = keyof typeof STRIPE_PRICE_IDS;

// Utility function to check if Stripe is properly configured
export function isStripeConfigured(): boolean {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return !!(publishableKey && !publishableKey.includes('placeholder') && !publishableKey.includes('your_stripe'));
}

// Subscription product information
export const SUBSCRIPTION_PLANS = {
  premium_monthly: {
    name: 'Premium Monthly',
    description: 'Full access to all premium features',
    price: 12.99,
    priceId: STRIPE_PRICE_IDS.premium_monthly,
    interval: 'month',
    features: [
      '15 AI requests per day (300/month)',
      'AI pantry chef & meal planning', 
      'AI weekly check-in coaching',
      'Advanced AI nutrition widgets',
      'Unlimited recipes & meal plans',
      'Priority customer support',
    ],
    savings: null,
  },
  premium_yearly: {
    name: 'Premium Yearly',
    description: 'Save 20% with annual billing',
    price: 129.99,
    priceId: STRIPE_PRICE_IDS.premium_yearly,
    interval: 'year',
    features: [
      'Everything in Premium Monthly',
      'Save £26.89 annually',
      'Priority feature requests',
      'Early access to new features',
    ],
    savings: 20,
  },
} as const;

// Client-side checkout function
export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  userId,
  userEmail,
}: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  userEmail: string;
}) {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        successUrl,
        cancelUrl,
        userId,
        userEmail,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    return sessionId;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Redirect to Stripe checkout
export async function redirectToCheckout({
  priceId,
  userId,
  userEmail,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
}) {
  try {
    // Check if Stripe is available
    const stripe = await getStripe();
    
    if (!stripe) {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey || publishableKey.includes('placeholder') || publishableKey.includes('your_stripe')) {
        throw new Error('Stripe is not configured. Payment processing is currently unavailable.');
      }
      throw new Error('Failed to load Stripe.js. Please check your internet connection and try again.');
    }

    // Create checkout session
    const sessionId = await createCheckoutSession({
      priceId,
      successUrl: `${window.location.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/upgrade?canceled=true`,
      userId,
      userEmail,
    });

    // Redirect to checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      console.error('Stripe checkout error:', error);
      throw new Error(error.message || 'Failed to redirect to checkout');
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    
    // Re-throw with more user-friendly message if needed
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('An unexpected error occurred during checkout. Please try again.');
  }
}

// Customer portal redirect
export async function redirectToCustomerPortal(userId: string) {
  try {
    const response = await fetch('/api/create-customer-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create customer portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error redirecting to customer portal:', error);
    throw error;
  }
}

// Utility functions for subscription management
export function formatPrice(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getDiscountedPrice(price: number, discountPercent: number): number {
  return price - (price * discountPercent / 100);
}

export function calculateYearlyPrice(monthlyPrice: number): number {
  return monthlyPrice * 12;
}

export function calculateSavings(monthlyPrice: number, yearlyPrice: number): {
  amount: number;
  percentage: number;
} {
  const yearlyFromMonthly = calculateYearlyPrice(monthlyPrice);
  const amount = yearlyFromMonthly - yearlyPrice;
  const percentage = Math.round((amount / yearlyFromMonthly) * 100);
  
  return { amount, percentage };
}