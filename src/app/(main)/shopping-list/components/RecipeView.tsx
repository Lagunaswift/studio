"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  AlertCircle, 
  Calendar,
  Users,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { 
  RecipeShoppingGroup,
  formatMealDate,
  getMealTypeEmoji,
  getPriorityBadgeVariant
} from '../utils/shopping-helpers';
import type { ShoppingListItem } from '@/types';

interface RecipeViewProps {
  recipeGroups: RecipeShoppingGroup[];
  filteredRecipeGroups: RecipeShoppingGroup[];
  onToggleItem: (itemId: string) => Promise<void>;
  className?: string;
}

interface CollapsedState {
  [recipeId: string]: boolean;
}

export function RecipeView({ 
  recipeGroups,
  filteredRecipeGroups, 
  onToggleItem,
  className 
}: RecipeViewProps) {
  const [collapsedRecipes, setCollapsedRecipes] = useState<CollapsedState>({});

  const toggleRecipe = (recipeId: string) => {
    setCollapsedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  const formatMealDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
      
      const thisWeekEnd = new Date(today);
      thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
      
      if (date <= thisWeekEnd) {
        return date.toLocaleDateString('en-GB', { weekday: 'long' });
      }
      
      return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getMealTypeEmoji = (mealType: string): string => {
    const mealTypeMap: Record<string, string> = {
      'breakfast': '🌅',
      'lunch': '🥪',
      'dinner': '🍽️',
      'snack': '🍪',
      'dessert': '🧁'
    };
    
    return mealTypeMap[mealType.toLowerCase()] || '🍽️';
  };

  const getPriorityBadgeVariant = (priority: 'today' | 'tomorrow' | 'later'): 'destructive' | 'default' | 'secondary' => {
    switch (priority) {
      case 'today': return 'destructive';
      case 'tomorrow': return 'default';
      default: return 'secondary';
    }
  };

  const formatQuantity = (item: ShoppingListItem): string => {
    if (!item.quantity || item.quantity <= 0) return '';
    
    // Handle fractions nicely
    if (item.quantity < 1) {
      if (item.quantity === 0.25) return '1/4';
      if (item.quantity === 0.33) return '1/3'; 
      if (item.quantity === 0.5) return '1/2';
      if (item.quantity === 0.67) return '2/3';
      if (item.quantity === 0.75) return '3/4';
      return item.quantity.toFixed(2).replace(/\.?0+$/, '');
    }
    
    // For larger quantities, show 1 decimal place max
    if (item.quantity < 10) {
      return item.quantity.toFixed(1).replace(/\.0$/, '');
    }
    
    return Math.round(item.quantity).toString();
  };

  const sortedFilteredGroups = useMemo(() => {
    return [...filteredRecipeGroups].sort((a, b) => {
      // Sort by priority first (today > tomorrow > later)
      const priorityOrder = { 'today': 0, 'tomorrow': 1, 'later': 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by date
      return new Date(a.mealDate).getTime() - new Date(b.mealDate).getTime();
    });
  }, [filteredRecipeGroups]);

  if (sortedFilteredGroups.length === 0) {
    return (
      <Card className={cn("text-center py-12", className)}>
        <CardContent>
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Recipes Found</h3>
          <p className="text-sm text-muted-foreground">
            No recipes match your current search criteria, or you haven't generated a shopping list yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sortedFilteredGroups.map((recipe, recipeIndex) => {
        const isCollapsed = collapsedRecipes[recipe.recipeId];
        const progressPercentage = recipe.totalCount > 0 
          ? Math.round((recipe.completedCount / recipe.totalCount) * 100) 
          : 0;

        return (
          <Card key={`recipe-${recipe.recipeId}-${recipe.mealDate}-${recipe.mealType}-${recipe.servings}-${recipeIndex}`} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold text-primary flex items-start">
                    <div className="flex items-center mr-2">
                      <span className="text-lg mr-1">
                        {getMealTypeEmoji(recipe.mealType)}
                      </span>
                      <Utensils className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{recipe.recipeName}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatMealDate(recipe.mealDate)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
                        </Badge>
                        {recipe.priority !== 'later' && (
                          <Badge variant={getPriorityBadgeVariant(recipe.priority)} className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {recipe.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {recipe.isComplete ? (
                    <Badge variant="default" className="text-xs bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {recipe.completedCount}/{recipe.totalCount}
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleRecipe(recipe.recipeId)}
                    className="h-8 w-8 p-0"
                  >
                    {isCollapsed ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronUp className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>
              
              {/* Progress bar */}
              {recipe.totalCount > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ingredient Progress</span>
                    <span>{progressPercentage}% complete</span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-2"
                    aria-label={`Recipe progress: ${progressPercentage}% complete`}
                  />
                </div>
              )}
            </CardHeader>
            
            {!isCollapsed && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {recipe.ingredients.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md transition-all duration-200 border",
                        item.purchased 
                          ? "bg-muted/30 opacity-70 border-muted" 
                          : "bg-card hover:bg-secondary/50 border-border hover:border-accent/50"
                      )}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Checkbox
                          id={`recipe-item-${item.id}`}
                          checked={item.purchased}
                          onCheckedChange={() => onToggleItem(item.id)}
                          aria-label={`Mark ${item.name} as ${item.purchased ? 'not purchased' : 'purchased'}`}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`recipe-item-${item.id}`}
                            className={cn(
                              "text-sm font-medium leading-tight cursor-pointer block",
                              item.purchased ? "line-through text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {item.name}
                          </label>
                          
                          {/* Show recipe context for items used in multiple recipes */}
                          {item.recipes && item.recipes.length > 1 && (
                            <div className="mt-1">
                              <TooltipProvider>
                                <Tooltip delayDuration={100}>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground cursor-help">
                                      Also needed for {item.recipes.length - 1} other recipe{item.recipes.length > 2 ? 's' : ''}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">Also needed for:</p>
                                    <ul className="space-y-1">
                                      {item.recipes
                                        .filter(r => r.recipeId.toString() !== recipe.recipeId)
                                        .slice(0, 3)
                                        .map(r => (
                                          <li key={r.recipeId} className="flex items-start">
                                            <span className="w-1 h-1 bg-current rounded-full mt-2 mr-2 shrink-0"></span>
                                            <span>{r.recipeName}</span>
                                          </li>
                                        ))
                                      }
                                      {item.recipes.length > 4 && (
                                        <li className="text-muted-foreground italic">
                                          ...and {item.recipes.length - 4} more
                                        </li>
                                      )}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span 
                          className={cn(
                            "text-sm font-medium",
                            item.purchased ? "text-muted-foreground" : "text-foreground"
                          )}
                        >
                          {formatQuantity(item)} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}