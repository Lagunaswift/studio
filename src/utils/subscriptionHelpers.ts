// src/utils/subscriptionHelpers.ts
import { UserProfileSettings } from '@/types';
import { SubscriptionTier, isWithinLimits, getUpgradeMessage } from '@/config/subscriptionLimits';
import { usageTracker } from '@/utils/usageTracker';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeMessage?: string;
  usageInfo?: {
    current: number;
    limit: number;
    period?: string;
  };
}

export function getUserTier(userProfile?: UserProfileSettings): SubscriptionTier {
  return userProfile?.subscription_status === 'active' ? 'premium' : 'free';
}

export function checkAIRequestLimit(userId: string, userProfile?: UserProfileSettings): LimitCheckResult {
  const tier = getUserTier(userProfile);
  const usage = usageTracker.getUserUsage(userId);
  const limitCheck = isWithinLimits(usage, 'aiRequest', tier);
  
  if (!limitCheck.allowed) {
    return {
      allowed: false,
      reason: limitCheck.reason,
      upgradeMessage: getUpgradeMessage(tier, 'aiRequest'),
      usageInfo: limitCheck.usage ? {
        current: limitCheck.usage.daily || limitCheck.usage.monthly || 0,
        limit: limitCheck.usage.limit,
        period: limitCheck.usage.daily !== undefined ? 'today' : 'this month'
      } : undefined
    };
  }
  
  return { allowed: true };
}

export function checkRecipeLimit(userId: string, userProfile?: UserProfileSettings): LimitCheckResult {
  const tier = getUserTier(userProfile);
  const usage = usageTracker.getUserUsage(userId);
  const limitCheck = isWithinLimits(usage, 'recipe', tier);
  
  if (!limitCheck.allowed) {
    return {
      allowed: false,
      reason: limitCheck.reason,
      upgradeMessage: getUpgradeMessage(tier, 'recipe'),
      usageInfo: limitCheck.usage ? {
        current: limitCheck.usage.total || 0,
        limit: limitCheck.usage.limit,
        period: 'total'
      } : undefined
    };
  }
  
  return { allowed: true };
}

export function checkMealPlanLimit(userId: string, userProfile?: UserProfileSettings): LimitCheckResult {
  const tier = getUserTier(userProfile);
  const usage = usageTracker.getUserUsage(userId);
  const limitCheck = isWithinLimits(usage, 'mealPlan', tier);
  
  if (!limitCheck.allowed) {
    return {
      allowed: false,
      reason: limitCheck.reason,
      upgradeMessage: getUpgradeMessage(tier, 'mealPlan'),
      usageInfo: limitCheck.usage ? {
        current: limitCheck.usage.monthly || 0,
        limit: limitCheck.usage.limit,
        period: 'this month'
      } : undefined
    };
  }
  
  return { allowed: true };
}

// Enhanced AI request wrapper that handles limits and shows modal
export async function makeAIRequestWithLimits(
  userId: string,
  userProfile: UserProfileSettings | undefined,
  aiFunction: () => Promise<any>,
  onLimitReached?: (limitInfo: {
    limitType: 'aiRequest';
    currentTier: SubscriptionTier;
    usageInfo?: { current: number; limit: number; period?: string };
  }) => void
): Promise<any> {
  const limitCheck = checkAIRequestLimit(userId, userProfile);
  
  if (!limitCheck.allowed) {
    // Show limit reached modal or callback
    if (onLimitReached) {
      onLimitReached({
        limitType: 'aiRequest',
        currentTier: getUserTier(userProfile),
        usageInfo: limitCheck.usageInfo
      });
    }
    throw new Error(limitCheck.reason || 'AI request limit reached');
  }
  
  try {
    return await aiFunction();
  } catch (error) {
    console.error('AI request failed:', error);
    throw error;
  }
}

// Track recipe creation with limits
export function createRecipeWithLimits(
  userId: string,
  userProfile: UserProfileSettings | undefined,
  onLimitReached?: (limitInfo: {
    limitType: 'recipe';
    currentTier: SubscriptionTier;
    usageInfo?: { current: number; limit: number; period?: string };
  }) => void
): boolean {
  const limitCheck = checkRecipeLimit(userId, userProfile);
  
  if (!limitCheck.allowed) {
    if (onLimitReached) {
      onLimitReached({
        limitType: 'recipe',
        currentTier: getUserTier(userProfile),
        usageInfo: limitCheck.usageInfo
      });
    }
    return false;
  }
  
  // Track the recipe creation
  usageTracker.trackRecipeCreation(userId);
  return true;
}

// Track meal plan creation with limits
export function createMealPlanWithLimits(
  userId: string,
  userProfile: UserProfileSettings | undefined,
  date: string,
  onLimitReached?: (limitInfo: {
    limitType: 'mealPlan';
    currentTier: SubscriptionTier;
    usageInfo?: { current: number; limit: number; period?: string };
  }) => void
): boolean {
  const limitCheck = checkMealPlanLimit(userId, userProfile);
  
  if (!limitCheck.allowed) {
    if (onLimitReached) {
      onLimitReached({
        limitType: 'mealPlan',
        currentTier: getUserTier(userProfile),
        usageInfo: limitCheck.usageInfo
      });
    }
    return false;
  }
  
  // Track the meal plan day
  usageTracker.trackMealPlanDay(userId, date);
  return true;
}

// Get usage percentage for progress bars
export function getUsagePercentage(userId: string, limitType: 'aiRequest' | 'recipe' | 'mealPlan', tier: SubscriptionTier) {
  const usage = usageTracker.getUserUsage(userId);
  const limitCheck = isWithinLimits(usage, limitType, tier);
  
  if (limitCheck.usage) {
    const current = limitCheck.usage.daily || limitCheck.usage.monthly || limitCheck.usage.total || 0;
    const limit = limitCheck.usage.limit;
    
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  }
  
  return 0;
}

// Initialize usage tracking for new users
export function initializeUserUsage(userId: string, tier: SubscriptionTier = 'free') {
  usageTracker.updateUserTier(userId, tier);
  
  // Load from Firebase if available
  if (typeof window !== 'undefined') {
    import('@/utils/usageTracker').then(({ loadUsageFromFirebase }) => {
      loadUsageFromFirebase(userId).catch(console.warn);
    });
  }
}