
"use client";

import type { ShoppingListItem } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Utensils } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ShoppingListItemProps {
  item: ShoppingListItem;
  onToggle: (id: string) => void;
}

export function ShoppingListItemComponent({ item, onToggle }: ShoppingListItemProps) {
  // Enhanced quantity formatting for shopping-friendly display
  const formatQuantityForShopping = (qty: number, unit: string): string => {
    if (!qty || qty <= 0) return '0';
    
    // Whole numbers for countable items
    if (['item', 'items', 'head', 'bulb', 'bottle', 'package', 'can', 'jar', 'container'].includes(unit.toLowerCase())) {
      return Math.ceil(qty).toString();
    }
    
    // Handle fractions nicely for cooking measurements
    if (qty < 1) {
      if (qty === 0.25) return '1/4';
      if (qty === 0.33) return '1/3'; 
      if (qty === 0.5) return '1/2';
      if (qty === 0.67) return '2/3';
      if (qty === 0.75) return '3/4';
      return qty.toFixed(2).replace(/\.?0+$/, '');
    }
    
    // For larger quantities, show 1 decimal place max
    if (qty < 10) {
      return qty.toFixed(1).replace(/\.0$/, '');
    }
    
    // Large quantities as whole numbers
    return Math.round(qty).toString();
  };

  const formattedQuantity = typeof item.quantity === 'number'
    ? formatQuantityForShopping(item.quantity, item.unit)
    : item.quantity;

  // Format unit for better readability
  const formatUnit = (unit: string): string => {
    if (!unit || unit === 'items') return '';
    if (unit === 'item') return '';
    return unit;
  };

  const formattedUnit = formatUnit(item.unit);
  const quantityDisplay = formattedUnit ? `${formattedQuantity} ${formattedUnit}` : formattedQuantity;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-md transition-all duration-200 border",
        item.purchased 
          ? "bg-muted/30 opacity-70 border-muted" 
          : "bg-card hover:bg-secondary/50 border-border hover:border-accent/50"
      )}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Checkbox
          id={`item-${item.id}`}
          checked={item.purchased}
          onCheckedChange={() => onToggle(item.id)}
          aria-label={`Mark ${item.name} as ${item.purchased ? 'not purchased' : 'purchased'}`}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`item-${item.id}`}
            className={cn(
              "text-sm font-medium leading-tight cursor-pointer block",
              item.purchased ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {item.name}
          </label>
          {/* Mobile recipe context */}
          {item.recipes && item.recipes.length > 0 && (
            <div className="sm:hidden mt-1">
              <span className="text-xs text-muted-foreground">
                For {item.recipes.length} recipe{item.recipes.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Desktop recipe badge */}
        {item.recipes && item.recipes.length > 0 && (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="hidden sm:inline-flex items-center cursor-default text-xs"
                >
                  <Utensils className="h-3 w-3 mr-1 text-accent"/>
                  {item.recipes.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs p-3 bg-popover text-popover-foreground rounded-md shadow-lg">
                <p className="font-semibold mb-2">Needed for:</p>
                <ul className="space-y-1">
                  {item.recipes.slice(0, 4).map(r => (
                    <li key={r.recipeId} className="flex items-start">
                      <span className="w-1 h-1 bg-current rounded-full mt-2 mr-2 shrink-0"></span>
                      <span>{r.recipeName}</span>
                    </li>
                  ))}
                  {item.recipes.length > 4 && (
                    <li className="text-muted-foreground italic">
                      ...and {item.recipes.length - 4} more
                    </li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Quantity display with better formatting */}
        <div className="text-right">
          <span 
            className={cn(
              "text-sm font-medium",
              item.purchased ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {quantityDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
