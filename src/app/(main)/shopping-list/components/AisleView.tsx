"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  ShoppingCart, 
  AlertCircle, 
  Package,
  Clock,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { 
  SimplifiedShoppingItem, 
  AisleGroups,
  getPriorityBadgeVariant
} from '../utils/shopping-helpers';

interface AisleViewProps {
  aisleGroups: AisleGroups;
  filteredAisleItems: SimplifiedShoppingItem[];
  sortedCategories: string[];
  onToggleItem: (item: SimplifiedShoppingItem) => Promise<void>;
  className?: string;
}

interface CollapsedState {
  [category: string]: boolean;
}

export function AisleView({ 
  aisleGroups, 
  filteredAisleItems, 
  sortedCategories, 
  onToggleItem,
  className 
}: AisleViewProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<CollapsedState>({});

  // Filter sorted categories to only show those with filtered items
  const visibleCategories = useMemo(() => {
    const filteredItemsByCategory: AisleGroups = {};
    
    filteredAisleItems.forEach(item => {
      if (!filteredItemsByCategory[item.category]) {
        filteredItemsByCategory[item.category] = [];
      }
      filteredItemsByCategory[item.category].push(item);
    });
    
    return sortedCategories.filter(category => 
      filteredItemsByCategory[category]?.length > 0
    ).map(category => ({
      name: category,
      items: filteredItemsByCategory[category]
    }));
  }, [sortedCategories, filteredAisleItems]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatQuantityDisplay = (item: SimplifiedShoppingItem): string => {
    if (item.originalItems.length === 1) {
      const original = item.originalItems[0];
      return `${original.quantity} ${original.unit}`.trim();
    }
    
    // Multiple items consolidated - show total or summary
    const totalQuantity = item.originalItems.reduce((sum, orig) => {
      if (typeof orig.quantity === 'number') return sum + orig.quantity;
      return sum;
    }, 0);
    
    if (totalQuantity > 0) {
      const commonUnit = item.originalItems[0]?.unit || '';
      return `${totalQuantity} ${commonUnit}`.trim();
    }
    
    return `${item.originalItems.length} recipes`;
  };

  const getPriorityIcon = (priority: 'today' | 'tomorrow' | 'later') => {
    switch (priority) {
      case 'today':
        return <Clock className="h-3 w-3 text-red-500" />;
      case 'tomorrow':
        return <Clock className="h-3 w-3 text-orange-500" />;
      default:
        return null;
    }
  };

  const getPriorityBadgeVariant = (priority: 'today' | 'tomorrow' | 'later'): 'destructive' | 'default' | 'secondary' => {
    switch (priority) {
      case 'today': return 'destructive';
      case 'tomorrow': return 'default';
      default: return 'secondary';
    }
  };

  if (visibleCategories.length === 0) {
    return (
      <Card className={cn("text-center py-12", className)}>
        <CardContent>
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Items Found</h3>
          <p className="text-sm text-muted-foreground">
            No items match your current search or filter criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {visibleCategories.map(({ name: category, items }) => {
        const isCollapsed = collapsedCategories[category];
        const completedCount = items.filter(item => item.purchased).length;
        const totalCount = items.length;
        const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <Package className="h-5 w-5 mr-2 text-accent" />
                  {category}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {completedCount}/{totalCount}
                  </Badge>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {completionPercentage === 100 && totalCount > 0 && (
                    <Badge variant="default" className="text-xs bg-green-600">
                      Complete
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className="h-8 w-8 p-0"
                  >
                    {isCollapsed ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronUp className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {!isCollapsed && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {items.map((item) => (
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
                          id={`aisle-item-${item.id}`}
                          checked={item.purchased}
                          onCheckedChange={() => onToggleItem(item)}
                          aria-label={`Mark ${item.name} as ${item.purchased ? 'not purchased' : 'purchased'}`}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`aisle-item-${item.id}`}
                            className={cn(
                              "text-sm font-medium leading-tight cursor-pointer block",
                              item.purchased ? "line-through text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {item.name}
                          </label>
                          
                          {/* Mobile context info */}
                          <div className="sm:hidden mt-1 flex items-center space-x-2">
                            {item.recipeCount > 1 && (
                              <span className="text-xs text-muted-foreground">
                                {item.recipeCount} recipes
                              </span>
                            )}
                            {item.priority !== 'later' && (
                              <Badge variant={getPriorityBadgeVariant(item.priority)} className="text-xs h-4">
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                        {/* Desktop badges */}
                        <div className="hidden sm:flex items-center space-x-2">
                          {item.recipeCount > 1 && (
                            <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="cursor-default text-xs">
                                    <Star className="h-3 w-3 mr-1 text-accent"/>
                                    {item.recipeCount}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Used in {item.recipeCount} recipes
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {item.priority !== 'later' && (
                            <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <Badge variant={getPriorityBadgeVariant(item.priority)} className="text-xs">
                                    {getPriorityIcon(item.priority)}
                                    {item.priority}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Priority: {item.priority}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        
                        {/* Quantity display */}
                        <div className="text-right">
                          <span 
                            className={cn(
                              "text-sm font-medium",
                              item.purchased ? "text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {formatQuantityDisplay(item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Bulk suggestion */}
                  {items.some(item => item.bulkSuggestion) && (
                    <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-md">
                      <div className="space-y-1">
                        {items
                          .filter(item => item.bulkSuggestion)
                          .map(item => (
                            <p key={item.id} className="text-xs text-muted-foreground">
                              {item.bulkSuggestion}
                            </p>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}