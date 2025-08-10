// src/lib/subscriptionVerification.ts
import { UserProfileSettings } from '@/types';
import { SUBSCRIPTION_LIMITS, SubscriptionTier, isWithinLimits, UserUsage } from '@/config/subscriptionLimits';
import { usageTracker } from '@/utils/usageTracker';
import { getUserTier as getExistingUserTier, checkAIRequestLimit, checkRecipeLimit } from '@/utils/subscriptionHelpers';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  tier: SubscriptionTier;
  status: string; // 'active', 'canceled', 'past_due', etc.
  plan?: string;
  currentPeriodEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: {
    current: number;
    limit: number;
    period?: string;
  };
  upgradeMessage?: string;
  upgradeAction?: {
    type: 'upgrade' | 'billing_issue';
    message: string;
  };
}

/**
 * Get user's subscription tier based on their profile
 */
export function getUserTier(userProfile?: UserProfileSettings | null): SubscriptionTier {
  return getExistingUserTier(userProfile || undefined);
}

/**
 * Get detailed subscription status
 */
export function getSubscriptionStatus(userProfile?: UserProfileSettings | null): SubscriptionStatus {
  if (!userProfile) {
    return {
      isSubscribed: false,
      tier: 'free',
      status: 'inactive',
    };
  }

  const status = userProfile.subscription_status || 'inactive';
  const isSubscribed = status === 'active' || status === 'trialing';
  const tier = getUserTier(userProfile);

  return {
    isSubscribed,
    tier,
    status,
    plan: (userProfile as any).subscription_plan,
    currentPeriodEnd: (userProfile as any).subscription_current_period_end ? 
      new Date((userProfile as any).subscription_current_period_end) : undefined,
    stripeCustomerId: (userProfile as any).stripeCustomerId,
    stripeSubscriptionId: (userProfile as any).stripeSubscriptionId,
  };
}

/**
 * Check if a user can perform a specific action based on their subscription limits
 */
export function checkSubscriptionLimit(
  userId: string,
  requestType: 'aiRequest' | 'recipe' | 'mealPlan',
  userProfile?: UserProfileSettings | null
): LimitCheckResult {
  const subscriptionStatus = getSubscriptionStatus(userProfile);
  
  // If user has billing issues, allow limited access but show billing message
  if (subscriptionStatus.status === 'past_due' || subscriptionStatus.status === 'incomplete') {
    return {
      allowed: false,
      reason: 'Subscription has billing issues',
      upgradeAction: {
        type: 'billing_issue',
        message: 'Please update your payment method to continue using premium features.',
      },
    };
  }

  // Use existing helper functions for limit checking
  let limitResult: any;
  
  switch (requestType) {
    case 'aiRequest':
      limitResult = checkAIRequestLimit(userId, userProfile || undefined);
      break;
    case 'recipe':
      limitResult = checkRecipeLimit(userId, userProfile || undefined);
      break;
    case 'mealPlan':
      // For now, use AI request logic for meal plan (could be separated later)
      limitResult = checkAIRequestLimit(userId, userProfile || undefined);
      break;
    default:
      return { allowed: true };
  }

  if (!limitResult.allowed) {
    return {
      allowed: false,
      reason: limitResult.reason,
      usage: limitResult.usageInfo,
      upgradeMessage: limitResult.upgradeMessage,
      upgradeAction: {
        type: 'upgrade',
        message: limitResult.upgradeMessage || 'Upgrade to Premium for unlimited access!',
      },
    };
  }

  return { allowed: true };
}

/**
 * Get upgrade message based on user's current tier and the feature they're trying to access
 */
function getUpgradeMessage(tier: SubscriptionTier, requestType: string): string {
  if (tier === 'premium') {
    return 'You\'ve reached your premium limits. Please contact support if you need higher limits.';
  }

  const premiumLimits = SUBSCRIPTION_LIMITS.premium;
  
  switch (requestType) {
    case 'aiRequest':
      return `Upgrade to Premium for unlimited AI requests (currently ${premiumLimits.aiRequestsPerDay}/day, ${premiumLimits.aiRequestsPerMonth}/month)!`;
    case 'recipe':
      return 'Upgrade to Premium for unlimited recipes and advanced features!';
    case 'mealPlan':
      return 'Upgrade to Premium for unlimited meal planning and personalized AI coaching!';
    default:
      return 'Upgrade to Premium for unlimited access to all features!';
  }
}

/**
 * Track usage after successful action
 */
export function trackUsage(
  userId: string,
  requestType: 'aiRequest' | 'recipe' | 'mealPlan',
  amount: number = 1
): void {
  switch (requestType) {
    case 'aiRequest':
      usageTracker.trackAIRequest(userId, amount);
      break;
    case 'recipe':
      usageTracker.trackRecipeCreation(userId, amount);
      break;
    case 'mealPlan':
      usageTracker.trackMealPlanCreation(userId, amount);
      break;
  }
}

/**
 * Get user's current usage statistics
 */
export function getUsageStats(userId: string, userProfile?: UserProfileSettings | null) {
  const tier = getUserTier(userProfile);
  const limits = SUBSCRIPTION_LIMITS[tier];
  const summary = usageTracker.getUsageSummary(userId);

  return {
    tier,
    limits,
    usage: summary,
    percentages: {
      aiDaily: limits.aiRequestsPerDay === -1 ? 0 : 
        Math.min((summary.today.aiRequests / limits.aiRequestsPerDay) * 100, 100),
      aiMonthly: limits.aiRequestsPerMonth === -1 ? 0 :
        Math.min((summary.thisMonth.aiRequests / limits.aiRequestsPerMonth) * 100, 100),
      recipes: limits.maxRecipes === -1 ? 0 :
        Math.min((summary.total.recipes / limits.maxRecipes) * 100, 100),
      mealPlan: limits.mealPlanDaysPerMonth === -1 ? 0 :
        Math.min((summary.thisMonth.mealPlanDays / limits.mealPlanDaysPerMonth) * 100, 100),
    },
  };
}

/**
 * Reset user's usage (admin function)
 */
export function resetUsage(userId: string, resetType: 'daily' | 'monthly' | 'all' = 'all'): void {
  switch (resetType) {
    case 'daily':
      usageTracker.resetDailyUsage(userId);
      break;
    case 'monthly':
      usageTracker.resetMonthlyUsage(userId);
      break;
    case 'all':
      usageTracker.resetAllUsage(userId);
      break;
  }
}

/**
 * Check if user has access to a specific premium feature
 */
export function hasFeatureAccess(
  feature: keyof typeof SUBSCRIPTION_LIMITS.premium.features,
  userProfile?: UserProfileSettings | null
): boolean {
  const tier = getUserTier(userProfile);
  return SUBSCRIPTION_LIMITS[tier].features[feature];
}

/**
 * Validate subscription status and sync with Stripe if needed
 */
export async function validateAndSyncSubscription(
  userId: string,
  userProfile?: UserProfileSettings | null
): Promise<SubscriptionStatus> {
  const currentStatus = getSubscriptionStatus(userProfile);
  
  // If user has a Stripe customer ID but subscription status seems outdated,
  // we might want to sync with Stripe (this would require a server-side call)
  if (currentStatus.stripeCustomerId && !currentStatus.isSubscribed) {
    console.log('Subscription status may need sync for user:', userId);
    // In a real implementation, you might call a server function to sync with Stripe
    // For now, return current status
  }

  return currentStatus;
}

/**
 * Get user's subscription expiry information
 */
export function getSubscriptionExpiry(userProfile?: UserProfileSettings | null): {
  hasExpiry: boolean;
  expiryDate?: Date;
  daysUntilExpiry?: number;
  isExpiring?: boolean; // within 7 days
} {
  const subscriptionStatus = getSubscriptionStatus(userProfile);
  
  if (!subscriptionStatus.currentPeriodEnd) {
    return { hasExpiry: false };
  }

  const expiryDate = subscriptionStatus.currentPeriodEnd;
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiring = daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  return {
    hasExpiry: true,
    expiryDate,
    daysUntilExpiry,
    isExpiring,
  };
}