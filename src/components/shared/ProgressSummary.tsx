"use client";

import type { MacroTargets, Macros } from '@/types';

interface ProgressSummaryProps {
  consumedMacros: Macros;
  targetMacros: MacroTargets;
  className?: string;
}

export function ProgressSummary({ consumedMacros, targetMacros, className = "" }: ProgressSummaryProps) {
  const macros = [
    { 
      key: 'calories', 
      label: 'Calories', 
      consumed: consumedMacros.calories, 
      target: targetMacros.calories, 
      unit: '', 
      color: 'text-red-500',
      bgColor: 'bg-red-500'
    },
    { 
      key: 'protein', 
      label: 'Protein', 
      consumed: consumedMacros.protein, 
      target: targetMacros.protein, 
      unit: 'g', 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500'
    },
    { 
      key: 'carbs', 
      label: 'Carbs', 
      consumed: consumedMacros.carbs, 
      target: targetMacros.carbs, 
      unit: 'g', 
      color: 'text-green-500',
      bgColor: 'bg-green-500'
    },
    { 
      key: 'fat', 
      label: 'Fat', 
      consumed: consumedMacros.fat, 
      target: targetMacros.fat, 
      unit: 'g', 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500'
    }
  ];

  return (
    <div className={`p-3 bg-muted/30 rounded-lg ${className}`}>
      <h4 className="font-semibold text-sm mb-2">Progress Summary</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {macros.map(({ key, label, consumed, target, unit, color, bgColor }) => {
          const percentage = target > 0 ? Math.round((consumed / target) * 100) : 0;
          return (
            <div key={key} className="text-center">
              <div className={`font-semibold ${color}`}>
                {percentage}%
              </div>
              <div className="text-muted-foreground">{label}</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${bgColor}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}