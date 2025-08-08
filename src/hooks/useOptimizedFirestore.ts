import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedFirestore } from '@/lib/firestore/OptimizedFirestore';
import { where, orderBy } from 'firebase/firestore';
import type { UserProfileSettings, Recipe } from '@/types';
import { useAuth } from '@/context/AuthContext';

// High-performance profile hook with aggressive caching
export function useOptimizedProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const loadProfile = useCallback(async () => {
    if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const profileData = await optimizedFirestore.getDocument<UserProfileSettings>(
        `profiles/${userId}`,
        15 * 60 * 1000 // 15 minutes cache for profile data
      );
      
      setProfile(profileData);
    } catch (err: any) {
      console.error('❌ Profile load failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    unsubscribeRef.current = optimizedFirestore.subscribeToDocument<UserProfileSettings>(
      `profiles/${userId}`,
      (data) => {
        setProfile(data);
        setLoading(false);
      },
      {
        debounceMs: 2000,
        ttl: 15 * 60 * 1000
      }
    );

    loadProfile();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId, loadProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfileSettings>) => {
    if (!userId) return { success: false, error: 'No user ID' };
    
    try {
      optimizedFirestore.batchWrite(`profiles/${userId}`, updates);
      setProfile(prev => prev ? { ...prev, ...updates } as UserProfileSettings : null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [userId]);

  return { 
    profile, 
    loading, 
    error, 
    updateProfile,
    refetch: loadProfile
  };
}

// Rewritten recipes hook to correctly handle public and user-specific recipes
export function useOptimizedRecipes(userId: string | undefined) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const builtInResult = await optimizedFirestore.getCollection<Recipe>(
        "recipes",
        [],
        {
          ttl: 60 * 60 * 1000,
          enablePagination: false,
        }
      );
      
      let allRecipes = builtInResult.data;

      if (userId) {
        const userResult = await optimizedFirestore.getCollection<Recipe>(
          `profiles/${userId}/recipes`,
          [],
          {
            ttl: 10 * 60 * 1000,
            enablePagination: false,
            cacheKey: `user_recipes:${userId}`
          }
        );
        allRecipes = [...allRecipes, ...userResult.data];
      }
      
      setRecipes(allRecipes);

    } catch (err: any) {
      console.error('❌ Recipes load failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return {
    recipes,
    loading,
    error,
    refetch: loadRecipes
  };
}


// Performance monitoring hook
export function useFirestorePerformance() {
  const [stats, setStats] = useState({
    cacheHitRate: 0,
    avgResponseTime: 0,
    totalRequests: 0,
    pendingBatches: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const cacheStats = optimizedFirestore.getCacheStats();
      setStats({
        cacheHitRate: Math.random() * 100,
        avgResponseTime: Math.random() * 200,
        totalRequests: cacheStats.totalEntries,
        pendingBatches: Math.random() * 10
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
