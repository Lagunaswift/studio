
import { DailyWeightLog, DailyMacroLog } from './types';

/**
 * Fill gaps in weight data using linear interpolation (like MacroFactor)
 */
export const fillWeightGaps = (weightLog: DailyWeightLog[]): DailyWeightLog[] => {
  const sorted = [...weightLog].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const filled: DailyWeightLog[] = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    filled.push(sorted[i]);
    
    const currentDate = new Date(sorted[i].date);
    const nextDate = new Date(sorted[i + 1].date);
    const daysDiff = Math.round((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Fill gaps up to 3 days with linear interpolation
    if (daysDiff > 1 && daysDiff <= 3) {
      const weightDiff = sorted[i + 1].weightKg - sorted[i].weightKg;
      const weightStep = weightDiff / daysDiff;
      
      for (let day = 1; day < daysDiff; day++) {
        const interpolatedDate = new Date(currentDate);
        interpolatedDate.setDate(currentDate.getDate() + day);
        
        filled.push({
          id: `interpolated-${sorted[i].id}-${day}`,
          date: interpolatedDate.toISOString().split('T')[0],
          weightKg: parseFloat((sorted[i].weightKg + (weightStep * day)).toFixed(1)),
          notes: 'Interpolated',
          isInterpolated: true,
          trendWeightKg: undefined
        });
      }
    }
  }
  
  if (sorted.length > 0) {
    filled.push(sorted[sorted.length - 1]);
  }
  
  return filled;
};

/**
 * Calculate robust mean with outlier detection
 */
export const calculateRobustMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  if (values.length <= 2) return values.reduce((sum, v) => sum + v, 0) / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - (1.5 * iqr);
  const upperBound = q3 + (1.5 * iqr);
  
  const filtered = values.filter(v => v >= lowerBound && v <= upperBound);
  
  if (filtered.length < values.length * 0.7) {
    return sorted[Math.floor(sorted.length / 2)]; // Use median
  }
  
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
};
