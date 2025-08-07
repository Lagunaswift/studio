'use client';

import { useState, useCallback } from 'react';
import { optimizedAIService } from '@/lib/ai/OptimizedAIService';
import { useAuth } from '@/context/AuthContext';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function AISuggestionsPage() {
  const { user } = useAuth();
  const { profile } = useOptimizedProfile(user?.uid);
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(optimizedAIService.getUsageStats());

  const generateMealPlan = useCallback(async (forceRefresh = false) => {
    if (!profile) return;

    setLoading(true);
    try {
      const preferences = {
        dietType: profile.dietaryPreferences?.join(', '),
        allergens: profile.allergens,
        targetCalories: profile.macroTargets?.calories,
        targetMacros: profile.macroTargets ? {
          protein: profile.macroTargets.protein,
          carbs: profile.macroTargets.carbs,
          fat: profile.macroTargets.fat
        } : undefined,
        activityLevel: profile.activityLevel,
        goals: [profile.primaryGoal || '']
      };

      const result = await optimizedAIService.generateMealPlan(
        preferences,
        7, // 7 days
        { 
          forceRefresh,
          priority: forceRefresh ? 'high' : 'normal'
        }
      );

      if (result.success) {
        setMealPlan(result.data as any);
        setStats(optimizedAIService.getUsageStats());
      } else {
        console.error('Meal plan generation failed:', result.error);
        if (result.fallback) {
          setMealPlan(result.fallback as any);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Render component with stats display
  return (
    <PageWrapper title="AI Meal Suggestions">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI Meal Suggestions</h1>
          
          {/* AI Usage Stats */}
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">AI Usage Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cache Hit Rate:</span>
                <span className="ml-2 font-bold text-green-600">
                  {stats.cacheHitRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Requests:</span>
                <span className="ml-2 font-bold">{stats.totalRequests}</span>
              </div>
              <div>
                <span className="text-gray-600">Tokens Used:</span>
                <span className="ml-2 font-bold">{stats.totalTokensUsed.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="ml-2 font-bold text-blue-600">
                  ${stats.totalCost.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => generateMealPlan(false)}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Meal Plan (Cached)'}
          </button>
          
          <button
            onClick={() => generateMealPlan(true)}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Force Refresh
          </button>
        </div>

        {mealPlan && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Your 7-Day Meal Plan</h2>
            {/* Render meal plan */}
            <pre className="bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(mealPlan, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
