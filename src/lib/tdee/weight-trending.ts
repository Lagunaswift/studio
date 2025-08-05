
import { DailyWeightLog } from './types';


export const calculateAdvancedTrendWeight = (
  dailyWeightLog: DailyWeightLog[]
): DailyWeightLog[] => {
  if (!dailyWeightLog || dailyWeightLog.length < 3) {
    return dailyWeightLog.map(log => ({ ...log, trendWeightKg: undefined }));
  }

  const sorted = [...dailyWeightLog].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const result: DailyWeightLog[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      result.push({
        ...sorted[i],
        trendWeightKg: sorted[i].weightKg
      });
    } else {
      // Adaptive smoothing based on data variability
      const windowSize = Math.min(14, i + 1);
      const recentWeights = sorted.slice(Math.max(0, i - windowSize + 1), i + 1);
      
      // Calculate variability to adjust smoothing
      const weights = recentWeights.map(w => w.weightKg);
      const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
      const stdDev = Math.sqrt(variance);
      
      // Dynamic smoothing factor (more smoothing when data is noisy)
      const baseSmoothing = 0.1;
      const variabilityFactor = Math.min(stdDev / 2, 0.3);
      const alpha = baseSmoothing + variabilityFactor;
      
      // Exponential smoothing
      const previousTrend = result[i - 1].trendWeightKg!;
      const currentWeight = sorted[i].weightKg;
      const newTrend = (alpha * currentWeight) + ((1 - alpha) * previousTrend);
      
      result.push({
        ...sorted[i],
        trendWeightKg: parseFloat(newTrend.toFixed(2))
      });
    }
  }

  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
