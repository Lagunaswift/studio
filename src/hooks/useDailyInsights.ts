"use client";

import { useState, useEffect, useMemo } from 'react';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { 
  Battery, 
  TrendingDown, 
  AlertTriangle, 
  TrendingUp, 
  Moon, 
  Target,
  Activity,
  Scale
} from 'lucide-react';
import { format, subDays, startOfDay, isToday } from 'date-fns';

interface InsightData {
  type: 'energy' | 'weight' | 'plateau' | 'progress' | 'sleep' | 'protein' | 'hydration';
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  priority: 'low' | 'medium' | 'high';
  actionText?: string;
  actionHref?: string;
}

interface DailyInsightsState {
  todayInsight: InsightData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDailyInsights(userId?: string): DailyInsightsState {
  const { profile: userProfile, loading } = useOptimizedProfile(userId);
  const [insights, setInsights] = useState<DailyInsightsState>({
    todayInsight: null,
    isLoading: false,
    error: null,
  });

  // Generate insights based on user's data patterns
  const generateInsight = useMemo((): InsightData | null => {
    if (!userProfile || loading) return null;

    // Get recent data for pattern analysis
    const today = format(new Date(), 'yyyy-MM-dd');
    const recentLogs = userProfile.dailyVitalsLog || [];
    const recentWeightLogs = userProfile.dailyWeightLog || [];
    
    // Get last 7 days of vitals
    const last7Days = Array.from({ length: 7 }, (_, i) => 
      format(subDays(new Date(), i), 'yyyy-MM-dd')
    );
    
    const recentVitals = last7Days.map(date => 
      recentLogs.find(log => log.date === date)
    ).filter(Boolean);

    const recentWeights = last7Days.map(date =>
      recentWeightLogs.find(log => log.date === date)
    ).filter(Boolean);

    // Pattern 1: Energy Level Trends (High Priority)
    const energyLevels = recentVitals.slice(0, 3).map(v => v?.energy).filter(Boolean);
    if (energyLevels.length >= 3) {
      const lowEnergyDays = energyLevels.filter(e => e === 'low').length;
      if (lowEnergyDays >= 2) {
        return {
          type: 'energy',
          title: '🔋 Energy Alert',
          message: `You've had low energy for ${lowEnergyDays} of the last 3 days. This could indicate inadequate sleep, under-eating, or overtraining. Consider checking your sleep quality and meal timing.`,
          icon: Battery,
          color: 'text-amber-600',
          priority: 'high',
          actionText: 'Log Today\'s Vitals',
          actionHref: '/daily-check-in'
        };
      }
      
      const highEnergyDays = energyLevels.filter(e => e === 'high').length;
      if (highEnergyDays >= 2) {
        return {
          type: 'energy',
          title: '⚡ Energy Momentum',
          message: `Great energy levels for ${highEnergyDays} days straight! Your current approach is working well. Consistency with sleep and nutrition is paying off.`,
          icon: Battery,
          color: 'text-green-600',
          priority: 'low',
          actionText: 'Keep the Streak',
          actionHref: '/daily-check-in'
        };
      }
    }

    // Pattern 2: Sleep Quality Issues (High Priority)
    const sleepQuality = recentVitals.slice(0, 3).map(v => v?.sleepQuality).filter(Boolean);
    if (sleepQuality.length >= 2) {
      const avgSleep = sleepQuality.reduce((a, b) => a + b, 0) / sleepQuality.length;
      if (avgSleep <= 5) {
        return {
          type: 'sleep',
          title: '😴 Sleep Recovery Needed',
          message: `Your sleep quality averaged ${avgSleep.toFixed(1)}/10 recently. Poor sleep increases hunger hormones by 20% and makes weight management much harder.`,
          icon: Moon,
          color: 'text-purple-600',
          priority: 'high',
          actionText: 'Review Sleep Tips',
          actionHref: '/guide'
        };
      }
    }

    // Pattern 3: Weight Trend Analysis (Medium Priority)
    if (recentWeights.length >= 5) {
      const weights = recentWeights.map(w => w?.weight).filter(Boolean);
      const firstWeight = weights[weights.length - 1];
      const lastWeight = weights[0];
      const weightChange = lastWeight - firstWeight;

      // Significant weight change
      if (Math.abs(weightChange) >= 1) {
        if (weightChange > 1) {
          return {
            type: 'weight',
            title: '📈 Weight Trend Notice',
            message: `Weight increased ${weightChange.toFixed(1)}kg over 5 days. This could be water retention, muscle gain, or calorie surplus. Your next weekly check-in will help optimize targets.`,
            icon: TrendingUp,
            color: 'text-blue-600',
            priority: 'medium',
            actionText: 'Weekly Check-in',
            actionHref: '/weekly-check-in'
          };
        } else {
          return {
            type: 'weight',
            title: '📉 Strong Progress',
            message: `Excellent! Weight dropped ${Math.abs(weightChange).toFixed(1)}kg in 5 days. You're in a great rhythm with your nutrition and training consistency.`,
            icon: TrendingDown,
            color: 'text-green-600',
            priority: 'low',
            actionText: 'Keep It Up',
            actionHref: '/daily-check-in'
          };
        }
      }

      // Plateau detection (same weight for 4+ days)
      const recentWeightValues = weights.slice(0, 4);
      const weightVariation = Math.max(...recentWeightValues) - Math.min(...recentWeightValues);
      if (weightVariation < 0.3 && recentWeightValues.length >= 4) {
        return {
          type: 'plateau',
          title: '📊 Plateau Detected',
          message: `Weight has been stable (±0.3kg) for 4 days. This is normal and doesn't mean your plan isn't working. Body composition changes can occur without scale movement.`,
          icon: Activity,
          color: 'text-amber-600',
          priority: 'medium',
          actionText: 'Weekly Check-in',
          actionHref: '/weekly-check-in'
        };
      }
    }

    // Pattern 4: Macro Target Achievement (Low Priority)
    const hasTargets = userProfile.macroTargets && userProfile.macroTargets.protein > 0;
    if (hasTargets) {
      return {
        type: 'protein',
        title: '🎯 Daily Target Focus',
        message: `Your protein target is ${userProfile.macroTargets.protein}g today. Aim for 25-35g per main meal for optimal muscle support and satiety.`,
        icon: Target,
        color: 'text-teal-600',
        priority: 'low',
        actionText: 'Plan Today\'s Meals',
        actionHref: '/ai-suggestions'
      };
    }

    // Default motivational insight if no patterns detected
    return {
      type: 'progress',
      title: '🌟 Keep Building Momentum',
      message: `Every day of consistent tracking builds toward your goals. Small actions compound into major results over time.`,
      icon: TrendingUp,
      color: 'text-blue-600',
      priority: 'low',
      actionText: 'Log Today\'s Progress',
      actionHref: '/daily-check-in'
    };
  }, [userProfile, loading]);

  // Update insights when data changes
  useEffect(() => {
    if (loading) {
      setInsights(prev => ({ ...prev, isLoading: true }));
    } else {
      setInsights({
        todayInsight: generateInsight,
        isLoading: false,
        error: null
      });
    }
  }, [generateInsight, loading]);

  return insights;
}

// Helper function to detect patterns in time series data
function detectTrend(values: number[], minLength: number = 3): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < minLength) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  const threshold = 0.1; // Adjust based on data type
  
  if (difference > threshold) return 'increasing';
  if (difference < -threshold) return 'decreasing';
  return 'stable';
}

// Pattern detection utilities
export const PatternDetection = {
  energyDowntrend: (vitals: any[], days: number = 3) => {
    const recent = vitals.slice(0, days).map(v => v?.energy).filter(Boolean);
    return recent.filter(e => e === 'low').length >= Math.ceil(days / 2);
  },
  
  sleepQualityDrop: (vitals: any[], threshold: number = 6) => {
    const recent = vitals.slice(0, 3).map(v => v?.sleepQuality).filter(Boolean);
    if (recent.length === 0) return false;
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return avg < threshold;
  },
  
  weightPlateau: (weights: any[], days: number = 4, threshold: number = 0.3) => {
    const recent = weights.slice(0, days).map(w => w?.weight).filter(Boolean);
    if (recent.length < days) return false;
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    return (max - min) < threshold;
  }
};