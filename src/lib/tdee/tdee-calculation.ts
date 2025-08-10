
import { DailyWeightLog, DailyMacroLog, TDEECalculationResult } from './types';
import { calculateAdvancedTrendWeight } from './weight-trending';
import { fillWeightGaps, calculateRobustMean } from './data-processing';

/**
 * Advanced TDEE calculation using multiple time windows and robust statistics
 */
export const calculateDynamicTdeeAdvanced = (
  weightLog: DailyWeightLog[], 
  macroLog: DailyMacroLog[], 
  minDays: number = 14
): TDEECalculationResult => {
  if (weightLog.length < minDays || macroLog.length < minDays) {
    throw new Error(`Need at least ${minDays} days of data for accurate calculation`);
  }

  // Fill gaps and calculate trend weights
  const filledWeightData = fillWeightGaps(weightLog);
  const trendWeights = calculateAdvancedTrendWeight(filledWeightData);
  
  // Multiple time window analysis
  const analysisWindows = [14, 21, 28];
  const estimates: { days: number; tdeeEstimate: number; weight: number }[] = [];
  
  for (const windowDays of analysisWindows) {
    if (trendWeights.length >= windowDays && macroLog.length >= windowDays) {
      const recentWeights = trendWeights.slice(-windowDays);
      const recentMacros = macroLog.slice(-windowDays);
      
      // Calculate weight change using trend weights
      const startTrend = recentWeights[0].trendWeightKg!;
      const endTrend = recentWeights[recentWeights.length - 1].trendWeightKg!;
      const weightChangeKg = endTrend - startTrend;
      const weeklyWeightChangeKg = (weightChangeKg / windowDays) * 7;
      
      // Robust calorie averaging
      const calories = recentMacros.map(m => m.calories);
      const avgCalories = calculateRobustMean(calories);
      
      // TDEE = Average Calories - (Weight Change * 7700 / 7)
      const calorieEquivalentPerDay = (weeklyWeightChangeKg * 7700) / 7;
      const tdeeEstimate = avgCalories - calorieEquivalentPerDay;
      
      // Weight based on window length (favor shorter windows)
      const weight = windowDays === 14 ? 0.5 : windowDays === 21 ? 0.3 : 0.2;
      
      estimates.push({ days: windowDays, tdeeEstimate, weight });
    }
  }
  
  // Weighted average of estimates
  const totalWeight = estimates.reduce((sum, est) => sum + est.weight, 0);
  const weightedTdee = estimates.reduce((sum, est) => {
    return sum + (est.tdeeEstimate * est.weight);
  }, 0) / totalWeight;
  
  return {
    dynamicTdee: Math.round(weightedTdee),
    weeklyWeightChangeKg: calculateWeeklyChange(trendWeights.slice(-14)),
    avgDailyCalories: Math.round(calculateRobustMean(macroLog.slice(-14).map(m => m.calories))),
    confidence: calculateConfidence(estimates.map(e => e.tdeeEstimate)),
    dataQuality: assessDataQuality(filledWeightData, macroLog),
    analysisWindows: estimates
  };
};

// Helper functions
const calculateWeeklyChange = (weights: DailyWeightLog[]): number => {
  if (weights.length < 7) return 0;
  const recent = weights.slice(-7);
  const start = recent[0].trendWeightKg || recent[0].weightKg;
  const end = recent[recent.length - 1].trendWeightKg || recent[recent.length - 1].weightKg;
  return parseFloat(((end - start) / 7 * 7).toFixed(3));
};

const calculateConfidence = (estimates: number[]): 'high' | 'medium' | 'low' => {
  if (estimates.length < 2) return 'low';
  
  const mean = estimates.reduce((sum, e) => sum + e, 0) / estimates.length;
  const variance = estimates.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / estimates.length;
  const cv = Math.sqrt(variance) / mean;
  
  if (cv < 0.05) return 'high';
  if (cv < 0.10) return 'medium';
  return 'low';
};

const assessDataQuality = (weightData: DailyWeightLog[], macroData: DailyMacroLog[]) => {
  const weightCompleteness = weightData.filter(w => !w.isInterpolated).length / weightData.length;
  const macroCompleteness = macroData.length / weightData.length;
  
  return {
    weightCompleteness: parseFloat((weightCompleteness * 100).toFixed(1)),
    macroCompleteness: parseFloat((macroCompleteness * 100).toFixed(1)),
    overallQuality: weightCompleteness > 0.8 && macroCompleteness > 0.8 ? 'high' as const : 
                   weightCompleteness > 0.6 && macroCompleteness > 0.6 ? 'medium' as const : 'low' as const,
    missingDays: weightData.length - weightData.filter(w => !w.isInterpolated).length,
    interpolatedDays: weightData.filter(w => w.isInterpolated).length
  };
};
