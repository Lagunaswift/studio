// src/lib/stripe.ts
import { Stripe, loadStripe } from '@stripe/stripe-js';

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Price IDs for different subscription tiers
export const STRIPE_PRICE_IDS = {
  premium_monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly_placeholder',
  premium_yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly_placeholder',
} as const;

export type StripePriceId = keyof typeof STRIPE_PRICE_IDS;

// Subscription product information
export const SUBSCRIPTION_PLANS = {
  premium_monthly: {
    name: 'Premium Monthly',
    description: 'Full access to all premium features',
    price: 9.99,
    priceId: STRIPE_PRICE_IDS.premium_monthly,
    interval: 'month',
    features: [
      'Unlimited AI meal plan generations',
      'Advanced AI nutrition coaching',
      'Export your data',
      'Priority customer support',
      'Custom meal plan templates',
      'Advanced analytics dashboard',
    ],
    savings: null,
  },
  premium_yearly: {
    name: 'Premium Yearly',
    description: 'Save 20% with annual billing',
    price: 99.99,
    priceId: STRIPE_PRICE_IDS.premium_yearly,
    interval: 'year',
    features: [
      'Everything in Premium Monthly',
      'Save $20 annually',
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
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const sessionId = await createCheckoutSession({
      priceId,
      successUrl: `${window.location.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/upgrade?canceled=true`,
      userId,
      userEmail,
    });

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
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
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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