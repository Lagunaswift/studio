
import { TDEECalculationResult } from './types';

/**
 * Determines if recommendations should be updated (anti-overreaction logic)
 */
export const shouldUpdateRecommendations = (
  currentTdee: number, 
  previousTdee: number, 
  dataQuality: any,
  daysSinceLastUpdate: number
): boolean => {
  // Don't update too frequently (minimum 7 days)
  if (daysSinceLastUpdate < 7) return false;
  
  const changePercent = Math.abs(currentTdee - previousTdee) / previousTdee;
  
  // Require higher confidence for larger changes
  if (dataQuality.overallQuality === 'high') {
    return changePercent > 0.03; // 3% change threshold
  } else if (dataQuality.overallQuality === 'medium') {
    return changePercent > 0.05; // 5% change threshold
  } else {
    return changePercent > 0.08; // 8% change threshold
  }
};
