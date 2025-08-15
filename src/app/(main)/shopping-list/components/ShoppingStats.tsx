"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ShoppingCart, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShoppingStats } from '../utils/shopping-helpers';

interface ShoppingStatsProps {
  stats: ShoppingStats;
  className?: string;
}

export function ShoppingStatsComponent({ stats, className }: ShoppingStatsProps) {
  const {
    totalItems,
    purchasedItems,
    completionPercentage,
    recipesReady,
    totalRecipes
  } = stats;

  const isComplete = completionPercentage === 100;
  const isEmpty = totalItems === 0;

  if (isEmpty) {
    return (
      <Card className={cn("bg-muted/30 border-dashed", className)}>
        <CardContent className="p-6 text-center">
          <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Your shopping list is empty. Generate from your meal plan to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      {/* Shopping Progress */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Progress</span>
            </div>
            <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
              {completionPercentage}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{purchasedItems} of {totalItems}</span>
              {isComplete && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span>Done!</span>
                </div>
              )}
            </div>
            <Progress 
              value={completionPercentage} 
              className="h-2"
              aria-label={`Shopping progress: ${completionPercentage}% complete`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipes Ready */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Utensils className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Recipes Ready</span>
            </div>
            <Badge 
              variant={recipesReady === totalRecipes && totalRecipes > 0 ? "default" : "outline"} 
              className="text-xs"
            >
              {recipesReady}/{totalRecipes}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {recipesReady}
            </div>
            <div className="text-xs text-muted-foreground">
              {totalRecipes > 0 
                ? `${Math.round((recipesReady / totalRecipes) * 100)}% complete`
                : 'No recipes yet'
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}