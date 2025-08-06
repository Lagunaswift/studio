// src/utils/aiOptimizer.ts
import { UserProfileSettings } from '@/types';

interface AICache {
  [key: string]: {
    result: any;
    timestamp: number;
    expiresAt: number;
  };
}

class CostOptimizedAI {
  private cache: AICache = {};
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private userRequestCounts = new Map<string, number[]>();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMITS = {
    free: 5,      // 5 requests per minute
    pro: 25,      // 25 requests per minute  
    premium: 100  // 100 requests per minute
  };

  private generateCacheKey(input: any): string {
    // Create stable cache key from input
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return btoa(normalized).substring(0, 32);
  }

  private isRateLimited(userId: string, tier: 'free' | 'pro' | 'premium'): boolean {
    const now = Date.now();
    const requests = this.userRequestCounts.get(userId) || [];
    
    // Clean old requests outside window
    const recentRequests = requests.filter(time => now - time < this.RATE_LIMIT_WINDOW);
    this.userRequestCounts.set(userId, recentRequests);
    
    return recentRequests.length >= this.RATE_LIMITS[tier];
  }

  private recordRequest(userId: string): void {
    const requests = this.userRequestCounts.get(userId) || [];
    requests.push(Date.now());
    this.userRequestCounts.set(userId, requests);
  }

  private getCachedResult(cacheKey: string): any | null {
    const cached = this.cache[cacheKey];
    if (cached && Date.now() < cached.expiresAt) {
      console.log('✅ AI Cache HIT - Saved API call!');
      return cached.result;
    }
    
    if (cached) {
      delete this.cache[cacheKey]; // Clean expired
    }
    return null;
  }

  private setCachedResult(cacheKey: string, result: any): void {
    this.cache[cacheKey] = {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    };
    
    // Prevent memory leaks - limit cache size
    const cacheKeys = Object.keys(this.cache);
    if (cacheKeys.length > 100) {
      // Find and remove the oldest entry
      let oldestKey: string | null = null;
      let oldestTimestamp = Infinity;
      for (const key of cacheKeys) {
        if (this.cache[key].timestamp < oldestTimestamp) {
          oldestTimestamp = this.cache[key].timestamp;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        delete this.cache[oldestKey];
      }
    }
  }

  async optimizedAICall(
    userId: string,
    userTier: 'free' | 'pro' | 'premium',
    aiFunction: () => Promise<any>,
    input: any,
    options?: {
      cacheable?: boolean;
      maxInputSize?: number;
    }
  ): Promise<any> {
    const { cacheable = true, maxInputSize = 10000 } = options || {};
    
    if (this.isRateLimited(userId, userTier)) {
      throw new Error(`Rate limit exceeded. ${userTier} tier allows ${this.RATE_LIMITS[userTier]} requests per minute.`);
    }

    const inputSize = JSON.stringify(input).length;
    if (inputSize > maxInputSize) {
      console.warn(`⚠️ Large input detected (${inputSize} chars). Consider reducing input size.`);
    }

    const cacheKey = this.generateCacheKey(input);
    if (cacheable) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    this.recordRequest(userId);

    try {
      console.log('💰 Making AI API call - This costs money!');
      const result = await aiFunction();
      
      if (cacheable) {
        this.setCachedResult(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error('❌ AI API call failed:', error);
      throw error;
    }
  }
}

export const aiOptimizer = new CostOptimizedAI();

// Wrapper for suggestRecipesByIngredients
export async function optimizedSuggestRecipes(
  userId: string,
  userProfile: UserProfileSettings,
  input: any
) {
  const userTier = userProfile?.subscription_status === 'active' ? 'pro' : 'free';
  
  return aiOptimizer.optimizedAICall(
    userId,
    userTier,
    async () => {
      const { suggestRecipesByIngredients } = await import('@/ai/flows/suggest-recipes-by-ingredients-flow');
      
      const optimizedInput = {
        ...input,
        userIngredients: input.userIngredients?.slice(0, 15) || [],
        availableRecipes: input.availableRecipes?.slice(0, 50) || [],
        maxResults: Math.min(input.maxResults || 3, 5)
      };
      
      return suggestRecipesByIngredients(optimizedInput);
    },
    input,
    {
      cacheable: true,
      maxInputSize: 8000
    }
  );
}

// Wrapper for proCoachFlow
export async function optimizedProCoachFlow(
  userId: string,
  userProfile: UserProfileSettings,
  input: any
) {
  const userTier = userProfile?.subscription_status === 'active' ? 'pro' : 'free';

  return aiOptimizer.optimizedAICall(
    userId,
    userTier,
    async () => {
      const { runProCoachFlow } = await import('@/ai/flows/pro-coach-flow');
      return runProCoachFlow(input);
    },
    input,
    {
      cacheable: false, // Don't cache personalized coaching
      maxInputSize: 3000
    }
  );
}
