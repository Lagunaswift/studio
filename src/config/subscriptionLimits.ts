// src/config/subscriptionLimits.ts
export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionLimits {
  aiRequestsPerDay: number;
  aiRequestsPerMonth: number;
  maxRecipes: number;
  mealPlanDaysPerMonth: number;
  features: {
    advancedAI: boolean;
    exportData: boolean;
    prioritySupport: boolean;
    customMealPlans: boolean;
  };
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    aiRequestsPerDay: 4,        
    aiRequestsPerMonth: 60,     
    maxRecipes: 20,            
    mealPlanDaysPerMonth: 25,   
    features: {
      advancedAI: false,
      exportData: false,
      prioritySupport: false,
      customMealPlans: false,
    },
  },
  premium: {
    aiRequestsPerDay: 15,        // Reduced from 150
    aiRequestsPerMonth: 300,     
    maxRecipes: -1,             // Unlimited
    mealPlanDaysPerMonth: -1,   // Unlimited
    features: {
      advancedAI: true,
      exportData: true,
      prioritySupport: true,
      customMealPlans: true,
    },
  },
};

// Usage tracking types
export interface DailyUsage {
  date: string; // YYYY-MM-DD
  aiRequests: number;
  mealPlanDays: number;
}

export interface MonthlyUsage {
  month: string; // YYYY-MM
  aiRequests: number;
  mealPlanDays: number;
  recipesCreated: number;
}

export interface UserUsage {
  userId: string;
  currentTier: SubscriptionTier;
  totalRecipes: number;
  dailyUsage: DailyUsage[];
  monthlyUsage: MonthlyUsage[];
  lastUpdated: string;
}

// Usage tracking functions
export function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

export function isWithinLimits(
  usage: UserUsage, 
  requestType: 'aiRequest' | 'recipe' | 'mealPlan',
  tier: SubscriptionTier = usage.currentTier
): { allowed: boolean; reason?: string; usage?: any } {
  const limits = SUBSCRIPTION_LIMITS[tier];
  const today = getCurrentDateString();
  const currentMonth = getCurrentMonthString();
  
  // Get current usage
  const todayUsage = usage.dailyUsage.find(d => d.date === today);
  const monthUsage = usage.monthlyUsage.find(m => m.month === currentMonth);
  
  const dailyAI = todayUsage?.aiRequests || 0;
  const monthlyAI = monthUsage?.aiRequests || 0;
  const totalRecipes = usage.totalRecipes || 0;
  const monthlyMealPlan = monthUsage?.mealPlanDays || 0;

  switch (requestType) {
    case 'aiRequest':
      if (dailyAI >= limits.aiRequestsPerDay) {
        return {
          allowed: false,
          reason: `Daily AI request limit reached (${limits.aiRequestsPerDay}/day)`,
          usage: { daily: dailyAI, limit: limits.aiRequestsPerDay }
        };
      }
      if (monthlyAI >= limits.aiRequestsPerMonth) {
        return {
          allowed: false,
          reason: `Monthly AI request limit reached (${limits.aiRequestsPerMonth}/month)`,
          usage: { monthly: monthlyAI, limit: limits.aiRequestsPerMonth }
        };
      }
      break;
      
    case 'recipe':
      if (limits.maxRecipes !== -1 && totalRecipes >= limits.maxRecipes) {
        return {
          allowed: false,
          reason: `Recipe limit reached (${limits.maxRecipes} max)`,
          usage: { total: totalRecipes, limit: limits.maxRecipes }
        };
      }
      break;
      
    case 'mealPlan':
      if (limits.mealPlanDaysPerMonth !== -1 && monthlyMealPlan >= limits.mealPlanDaysPerMonth) {
        return {
          allowed: false,
          reason: `Monthly meal plan limit reached (${limits.mealPlanDaysPerMonth} days/month)`,
          usage: { monthly: monthlyMealPlan, limit: limits.mealPlanDaysPerMonth }
        };
      }
      break;
  }
  
  return { allowed: true };
}

export function getUpgradeMessage(tier: SubscriptionTier, requestType: string): string {
  const premiumLimits = SUBSCRIPTION_LIMITS.premium;
  
  switch (requestType) {
    case 'aiRequest':
      return `Upgrade to Premium for ${premiumLimits.aiRequestsPerDay} AI requests per day (${premiumLimits.aiRequestsPerMonth}/month)!`;
    case 'recipe':
      return 'Upgrade to Premium for unlimited recipes!';
    case 'mealPlan':
      return 'Upgrade to Premium for unlimited meal planning!';
    default:
      return 'Upgrade to Premium for unlimited access to all features!';
  }
}

// Rate limiting (per minute) - separate from daily/monthly limits
export const RATE_LIMITS = {
  free: 5,      // 5 requests per minute
  premium: 25,  // 25 requests per minute  
};
