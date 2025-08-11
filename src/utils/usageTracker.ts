// src/utils/usageTracker.ts
import { 
  UserUsage, 
  DailyUsage, 
  MonthlyUsage,
  getCurrentDateString,
  getCurrentMonthString,
  SubscriptionTier
} from '@/config/subscriptionLimits';
import { safeLocalStorage } from '@/lib/safe-storage';

const USAGE_STORAGE_KEY = 'meal_planner_usage';

export class UsageTracker {
  private storage: Storage;
  
  constructor(storage?: Storage) {
    // Use safeLocalStorage by default, fallback to provided storage
    this.storage = storage || {
      getItem: (key: string) => safeLocalStorage.getItem(key),
      setItem: (key: string, value: string) => safeLocalStorage.setItem(key, value),
      removeItem: (key: string) => safeLocalStorage.removeItem(key),
      clear: () => safeLocalStorage.clear(),
      length: 0,
      key: () => null
    };
  }
  
  // Get current usage for user
  getUserUsage(userId: string): UserUsage {
    try {
      const stored = this.storage.getItem(`${USAGE_STORAGE_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load usage data:', error);
    }
    
    // Return default usage structure
    return {
      userId,
      currentTier: 'free',
      totalRecipes: 0,
      dailyUsage: [],
      monthlyUsage: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  
  // Save usage data
  private saveUserUsage(usage: UserUsage): void {
    try {
      usage.lastUpdated = new Date().toISOString();
      this.storage.setItem(`${USAGE_STORAGE_KEY}_${usage.userId}`, JSON.stringify(usage));
    } catch (error) {
      console.error('Failed to save usage data:', error);
    }
  }
  
  // Update tier (when user upgrades/downgrades)
  updateUserTier(userId: string, tier: SubscriptionTier): void {
    const usage = this.getUserUsage(userId);
    usage.currentTier = tier;
    this.saveUserUsage(usage);
  }
  
  // Track AI request
  trackAIRequest(userId: string): void {
    const usage = this.getUserUsage(userId);
    const today = getCurrentDateString();
    const currentMonth = getCurrentMonthString();
    
    // Update daily usage
    let dailyUsage = usage.dailyUsage.find(d => d.date === today);
    if (!dailyUsage) {
      dailyUsage = { date: today, aiRequests: 0, mealPlanDays: 0 };
      usage.dailyUsage.push(dailyUsage);
    }
    dailyUsage.aiRequests++;
    
    // Update monthly usage
    let monthlyUsage = usage.monthlyUsage.find(m => m.month === currentMonth);
    if (!monthlyUsage) {
      monthlyUsage = { month: currentMonth, aiRequests: 0, mealPlanDays: 0, recipesCreated: 0 };
      usage.monthlyUsage.push(monthlyUsage);
    }
    monthlyUsage.aiRequests++;
    
    // Clean old data (keep only last 90 days and 12 months)
    this.cleanOldUsageData(usage);
    this.saveUserUsage(usage);
  }
  
  // Track recipe creation
  trackRecipeCreation(userId: string): void {
    const usage = this.getUserUsage(userId);
    const currentMonth = getCurrentMonthString();
    
    usage.totalRecipes++;
    
    // Update monthly recipe count
    let monthlyUsage = usage.monthlyUsage.find(m => m.month === currentMonth);
    if (!monthlyUsage) {
      monthlyUsage = { month: currentMonth, aiRequests: 0, mealPlanDays: 0, recipesCreated: 0 };
      usage.monthlyUsage.push(monthlyUsage);
    }
    monthlyUsage.recipesCreated++;
    
    this.cleanOldUsageData(usage);
    this.saveUserUsage(usage);
  }
  
  // Track meal plan day
  trackMealPlanDay(userId: string, date: string): void {
    const usage = this.getUserUsage(userId);
    const currentMonth = getCurrentMonthString();
    
    // Update daily usage
    let dailyUsage = usage.dailyUsage.find(d => d.date === date);
    if (!dailyUsage) {
      dailyUsage = { date, aiRequests: 0, mealPlanDays: 0 };
      usage.dailyUsage.push(dailyUsage);
    }
    dailyUsage.mealPlanDays++;
    
    // Update monthly usage
    let monthlyUsage = usage.monthlyUsage.find(m => m.month === currentMonth);
    if (!monthlyUsage) {
      monthlyUsage = { month: currentMonth, aiRequests: 0, mealPlanDays: 0, recipesCreated: 0 };
      usage.monthlyUsage.push(monthlyUsage);
    }
    monthlyUsage.mealPlanDays++;
    
    this.cleanOldUsageData(usage);
    this.saveUserUsage(usage);
  }
  
  // Get usage summary for display
  getUsageSummary(userId: string) {
    const usage = this.getUserUsage(userId);
    const today = getCurrentDateString();
    const currentMonth = getCurrentMonthString();
    
    const todayUsage = usage.dailyUsage.find(d => d.date === today);
    const monthUsage = usage.monthlyUsage.find(m => m.month === currentMonth);
    
    return {
      tier: usage.currentTier,
      today: {
        aiRequests: todayUsage?.aiRequests || 0,
        mealPlanDays: todayUsage?.mealPlanDays || 0,
      },
      thisMonth: {
        aiRequests: monthUsage?.aiRequests || 0,
        mealPlanDays: monthUsage?.mealPlanDays || 0,
        recipesCreated: monthUsage?.recipesCreated || 0,
      },
      total: {
        recipes: usage.totalRecipes,
      },
    };
  }
  
  // Clean old usage data to prevent storage bloat
  private cleanOldUsageData(usage: UserUsage): void {
    const today = new Date();
    const cutoffDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
    const cutoffMonth = new Date(today.getTime() - (12 * 30 * 24 * 60 * 60 * 1000)); // 12 months ago
    
    // Keep only last 90 days of daily data
    usage.dailyUsage = usage.dailyUsage.filter(d => new Date(d.date) >= cutoffDate);
    
    // Keep only last 12 months of monthly data
    usage.monthlyUsage = usage.monthlyUsage.filter(m => new Date(m.month + '-01') >= cutoffMonth);
  }
  
  // Reset usage (for testing or tier changes)
  resetUsage(userId: string): void {
    const usage: UserUsage = {
      userId,
      currentTier: 'free',
      totalRecipes: 0,
      dailyUsage: [],
      monthlyUsage: [],
      lastUpdated: new Date().toISOString(),
    };
    this.saveUserUsage(usage);
  }
  
  // Export usage data (for premium users)
  exportUsageData(userId: string): string {
    const usage = this.getUserUsage(userId);
    return JSON.stringify(usage, null, 2);
  }
}

// Singleton instance
export const usageTracker = new UsageTracker();

// Firebase sync (for cross-device usage tracking)
export async function syncUsageToFirebase(userId: string): Promise<void> {
  if (typeof window === 'undefined') return; // Server-side safety
  
  try {
    const { db } = await import('@/lib/firebase-client');
    const { doc, setDoc } = await import('firebase/firestore');
    
    const usage = usageTracker.getUserUsage(userId);
    const docRef = doc(db, 'userUsage', userId);
    
    await setDoc(docRef, {
      ...usage,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
    
    console.log('✅ Usage synced to Firebase');
  } catch (error) {
    console.warn('Failed to sync usage to Firebase:', error);
  }
}

export async function loadUsageFromFirebase(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const { db } = await import('@/lib/firebase-client');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const docRef = doc(db, 'userUsage', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const firebaseUsage = docSnap.data() as UserUsage & { syncedAt: string };
      const localUsage = usageTracker.getUserUsage(userId);
      
      // Merge with local usage (keep the most recent)
      if (firebaseUsage.syncedAt && firebaseUsage.syncedAt > localUsage.lastUpdated) {
        safeLocalStorage.setItem(`${USAGE_STORAGE_KEY}_${userId}`, JSON.stringify(firebaseUsage));
        console.log('✅ Usage loaded from Firebase');
      }
    }
  } catch (error) {
    console.warn('Failed to load usage from Firebase:', error);
  }
}