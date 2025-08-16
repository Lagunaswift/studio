"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { redirectToCheckout, SUBSCRIPTION_PLANS, StripePriceId, formatPrice, isStripeConfigured } from '@/lib/stripe';

interface CheckoutButtonProps {
  priceId: StripePriceId;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  showPrice?: boolean;
  showSavings?: boolean;
  children?: React.ReactNode;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function CheckoutButton({
  priceId,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false,
  showPrice = true,
  showSavings = true,
  children,
  onSuccess,
  onError,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const plan = SUBSCRIPTION_PLANS[priceId];
  const isYearly = plan?.interval === 'year';

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to upgrade your subscription.',
        variant: 'destructive',
      });
      return;
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      toast({
        title: 'Payment System Unavailable',
        description: 'Payment processing is currently being configured. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await redirectToCheckout({
        priceId: plan.priceId,
        userId: user.uid,
        userEmail: user.email || '',
      });
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Checkout error:', error);
      
      const errorMessage = error?.message || 'Failed to start checkout process';
      
      toast({
        title: 'Checkout Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading || isAuthLoading || !user || !isStripeConfigured();

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={handleCheckout}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : children ? (
          children
        ) : (
          <>
            <Crown className="mr-2 h-4 w-4" />
            {showPrice && plan ? `Upgrade - ${formatPrice(plan.price)}/${plan.interval}` : 'Upgrade to Premium'}
          </>
        )}
      </Button>

      {/* Show savings badge for yearly plans */}
      {showSavings && plan?.savings && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <TrendingUp className="mr-1 h-3 w-3" />
            Save {plan.savings}% annually
          </Badge>
        </div>
      )}
    </div>
  );
}

// Specialized checkout buttons for common use cases
export function UpgradeButton({ className = '', ...props }: Omit<CheckoutButtonProps, 'priceId'>) {
  return (
    <CheckoutButton
      priceId="premium_monthly"
      variant="default"
      className={`bg-accent hover:bg-accent/90 text-accent-foreground ${className}`}
      {...props}
    >
      <Zap className="mr-2 h-4 w-4" />
      Upgrade to Premium
    </CheckoutButton>
  );
}

export function PricingCardButton({ 
  priceId, 
  isPopular = false, 
  className = '', 
  ...props 
}: CheckoutButtonProps & { isPopular?: boolean }) {
  const plan = SUBSCRIPTION_PLANS[priceId];
  
  return (
    <CheckoutButton
      priceId={priceId}
      variant={isPopular ? 'default' : 'outline'}
      size="lg"
      className={`w-full ${isPopular ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''} ${className}`}
      showPrice={false}
      {...props}
    >
      <Crown className="mr-2 h-5 w-5" />
      {plan ? `Get ${plan.name}` : 'Choose Plan'}
    </CheckoutButton>
  );
}

// Mini checkout button for CTAs in modals/alerts
export function MiniUpgradeButton({ className = '', ...props }: Omit<CheckoutButtonProps, 'priceId'>) {
  return (
    <CheckoutButton
      priceId="premium_monthly"
      variant="outline"
      size="sm"
      className={`border-accent text-accent hover:bg-accent hover:text-accent-foreground ${className}`}
      showPrice={false}
      {...props}
    >
      <Crown className="mr-1 h-3 w-3" />
      Upgrade
    </CheckoutButton>
  );
}