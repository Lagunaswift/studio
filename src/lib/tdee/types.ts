
// src/lib/tdee/types.ts

export interface DailyWeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
  trendWeightKg?: number;
  isInterpolated?: boolean; // Flag for gap-filled data
}

export interface DailyMacroLog {
  id: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
}

export interface TDEECalculationResult {
  dynamicTdee: number;
  weeklyWeightChangeKg: number;
  avgDailyCalories: number;
  confidence: 'high' | 'medium' | 'low';
  dataQuality: DataQualityMetrics;
  analysisWindows: {
    days: number;
    tdeeEstimate: number;
    weight: number;
  }[];
}

export interface DataQualityMetrics {
  weightCompleteness: number; // 0-100%
  macroCompleteness: number; // 0-100%
  overallQuality: 'high' | 'medium' | 'low';
  missingDays: number;
  interpolatedDays: number;
}

export interface WeeklyCheckInResult {
  success: boolean;
  message?: string;
  recommendation?: any; // Your existing PreppyOutput type
  tdeeResult?: TDEECalculationResult;
  shouldUpdate: boolean;
}
