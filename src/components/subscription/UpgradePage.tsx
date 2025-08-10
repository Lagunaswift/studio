"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Check, 
  Zap, 
  TrendingUp, 
  Users, 
  Shield, 
  Sparkles,
  ArrowRight,
  Star,
  Clock,
  BarChart3,
  Download,
  MessageCircle,
  Palette
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { PricingCardButton } from './CheckoutButton';
import { SUBSCRIPTION_PLANS, formatPrice, calculateSavings } from '@/lib/stripe';
import { SUBSCRIPTION_LIMITS } from '@/config/subscriptionLimits';
import { getUserTier } from '@/utils/subscriptionHelpers';

interface UpgradePageProps {
  showCancelledMessage?: boolean;
  highlightPlan?: 'monthly' | 'yearly';
}

export function UpgradePage({ showCancelledMessage = false, highlightPlan = 'yearly' }: UpgradePageProps) {
  const { user } = useAuth();
  const { userProfile, isSubscribed } = useAppContext();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const currentTier = getUserTier(userProfile);
  const freeLimits = SUBSCRIPTION_LIMITS.free;
  const premiumLimits = SUBSCRIPTION_LIMITS.premium;

  const monthlyPlan = SUBSCRIPTION_PLANS.premium_monthly;
  const yearlyPlan = SUBSCRIPTION_PLANS.premium_yearly;
  const savings = calculateSavings(monthlyPlan.price, yearlyPlan.price);

  if (isSubscribed) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <Crown className="h-4 w-4" />
            <span className="font-medium">Premium Member</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">You're all set!</h1>
          <p className="text-gray-600">
            You already have access to all premium features. Manage your subscription below.
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center space-y-4">
            <Crown className="h-12 w-12 text-accent mx-auto" />
            <div>
              <h3 className="font-semibold">Premium Plan Active</h3>
              <p className="text-sm text-gray-600">Unlimited access to all features</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.open('/api/create-customer-portal-session', '_blank')}
              className="w-full"
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Upgrade to <span className="text-accent">Premium</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock unlimited AI-powered meal planning and advanced features to achieve your nutrition goals faster.
          </p>
        </div>

        {showCancelledMessage && (
          <Alert className="max-w-md mx-auto">
            <AlertDescription>
              Your checkout was cancelled. No charges were made. You can try again anytime!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')} className="w-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly" className="relative">
              Yearly
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 text-xs">
                Save {savings.percentage}%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className={`${currentTier === 'free' ? 'ring-2 ring-gray-300' : ''}`}>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl">Free Plan</CardTitle>
            <div className="space-y-2">
              <div className="text-3xl font-bold">$0</div>
              <CardDescription>Perfect for getting started</CardDescription>
            </div>
            {currentTier === 'free' && (
              <Badge variant="outline" className="w-fit mx-auto">Current Plan</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{freeLimits.aiRequestsPerDay} AI requests per day</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Up to {freeLimits.maxRecipes} saved recipes</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Basic meal planning</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Community support</span>
              </li>
            </ul>
            <Button variant="outline" disabled className="w-full">
              {currentTier === 'free' ? 'Current Plan' : 'Downgrade Available'}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative ${highlightPlan === billingCycle ? 'ring-2 ring-accent shadow-xl' : ''}`}>
          {highlightPlan === billingCycle && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-accent text-accent-foreground px-3 py-1">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>
          )}
          
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-accent" />
              Premium Plan
            </CardTitle>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-accent">
                ${billingCycle === 'yearly' ? yearlyPlan.price : monthlyPlan.price}
              </div>
              <CardDescription>
                {billingCycle === 'yearly' ? 'per year' : 'per month'} • Billed {billingCycle}
              </CardDescription>
              {billingCycle === 'yearly' && (
                <div className="text-sm text-green-600 font-medium">
                  Save ${savings.amount} compared to monthly billing
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">Everything in Free, plus:</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Unlimited AI meal plan generations</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced AI nutrition coaching</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced analytics & insights</span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Export your data (CSV, PDF)</span>
              </li>
              <li className="flex items-start gap-2">
                <Palette className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Custom meal plan templates</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Priority customer support</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm">Early access to new features</span>
              </li>
            </ul>
            
            <PricingCardButton 
              priceId={billingCycle === 'yearly' ? 'premium_yearly' : 'premium_monthly'}
              isPopular={highlightPlan === billingCycle}
            />
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Compare Features</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left">Feature</th>
                <th className="border border-gray-200 px-4 py-3 text-center">Free</th>
                <th className="border border-gray-200 px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Crown className="h-4 w-4 text-accent" />
                    Premium
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-4 py-3">Daily AI Requests</td>
                <td className="border border-gray-200 px-4 py-3 text-center">{freeLimits.aiRequestsPerDay}</td>
                <td className="border border-gray-200 px-4 py-3 text-center text-accent font-semibold">Unlimited</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">Saved Recipes</td>
                <td className="border border-gray-200 px-4 py-3 text-center">{freeLimits.maxRecipes}</td>
                <td className="border border-gray-200 px-4 py-3 text-center text-accent font-semibold">Unlimited</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3">Advanced AI Features</td>
                <td className="border border-gray-200 px-4 py-3 text-center">❌</td>
                <td className="border border-gray-200 px-4 py-3 text-center">✅</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">Export Data</td>
                <td className="border border-gray-200 px-4 py-3 text-center">❌</td>
                <td className="border border-gray-200 px-4 py-3 text-center">✅</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3">Priority Support</td>
                <td className="border border-gray-200 px-4 py-3 text-center">❌</td>
                <td className="border border-gray-200 px-4 py-3 text-center">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Testimonials or FAQ could go here */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Questions?</h2>
        <p className="text-gray-600">
          Contact us at support@mealplannerapp.com or check out our{' '}
          <a href="/help" className="text-accent hover:underline">Help Center</a>
        </p>
      </div>
    </div>
  );
}