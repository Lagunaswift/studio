
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
  isStoreFriendlyMode: boolean;
}

// Helper function for store-friendly quantities
const getStoreFriendlyDisplay = (
  itemName: string,
  recipeQuantity: number,
  recipeUnit: string
): { displayQuantity: string | number; displayUnit: string } => {
  const lowerItemName = itemName.toLowerCase();
  const lowerRecipeUnit = recipeUnit.toLowerCase();

  if (lowerItemName.includes("egg")) {
    if (recipeQuantity <= 6) return { displayQuantity: 1, displayUnit: "box of 6" };
    if (recipeQuantity <= 12) return { displayQuantity: 1, displayUnit: "box of 12" };
    return { displayQuantity: Math.ceil(recipeQuantity / 12), displayUnit: "boxes of 12" };
  }

  if (lowerItemName.includes("yogurt") || lowerItemName.includes("yoghurt") || lowerItemName.includes("cottage cheese")) {
    if (lowerRecipeUnit === "g") {
      if (recipeQuantity <= 200) return { displayQuantity: 1, displayUnit: "200g pot" };
      if (recipeQuantity <= 500) return { displayQuantity: 1, displayUnit: "500g pot" };
      if (recipeQuantity <= 1000) return { displayQuantity: 1, displayUnit: "1kg tub" };
      // For larger quantities, suggest multiples of largest common size
      return { displayQuantity: Math.ceil(recipeQuantity / 500), displayUnit: "x 500g pots/tubs" };
    }
  }
  
  if (lowerItemName.includes("milk") || lowerItemName.includes("soy milk")) {
      if (lowerRecipeUnit === "ml") {
          if (recipeQuantity <= 1000) return {displayQuantity: 1, displayUnit: "1L carton"};
          return {displayQuantity: Math.ceil(recipeQuantity/1000), displayUnit: "x 1L cartons"};
      }
      if (lowerRecipeUnit === "l") {
          return {displayQuantity: Math.ceil(recipeQuantity), displayUnit: "x 1L cartons"};
      }
  }

  if (lowerItemName.includes("chicken breast")) {
    if (lowerRecipeUnit === "g") {
        // Assuming average chicken breast is ~150-200g
        const numBreasts = Math.ceil(recipeQuantity / 180);
        return { displayQuantity: numBreasts, displayUnit: `~${numBreasts*180}g pack`};
    }
  }


  // Default: return original recipe-derived quantity
  return { displayQuantity: recipeQuantity, displayUnit: recipeUnit };
};


export function ShoppingListItemComponent({ item, onToggle, isStoreFriendlyMode }: ShoppingListItemProps) {
  let finalDisplayQuantity: string | number = item.quantity;
  let finalDisplayUnit: string = item.unit;

  if (isStoreFriendlyMode) {
    const storeFriendly = getStoreFriendlyDisplay(item.name, item.quantity, item.unit);
    finalDisplayQuantity = storeFriendly.displayQuantity;
    finalDisplayUnit = storeFriendly.displayUnit;
  }
  
  // Format quantity for display (e.g., 0.5 instead of .5, integers as is)
  const formattedQuantity = typeof finalDisplayQuantity === 'number'
    ? (Number.isInteger(finalDisplayQuantity) ? finalDisplayQuantity : finalDisplayQuantity.toFixed(1))
    : finalDisplayQuantity;


  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-md transition-all duration-200",
        item.purchased ? "bg-muted/50 opacity-60" : "bg-card hover:bg-secondary/50"
      )}
    >
      <div className="flex items-center space-x-3">
        <Checkbox
          id={`item-${item.id}`}
          checked={item.purchased}
          onCheckedChange={() => onToggle(item.id)}
          aria-label={`Mark ${item.name} as ${item.purchased ? 'not purchased' : 'purchased'}`}
        />
        <label
          htmlFor={`item-${item.id}`}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            item.purchased ? "line-through text-muted-foreground" : "text-foreground"
          )}
        >
          {item.name}
        </label>
      </div>
      <div className="flex items-center space-x-3">
        {item.recipes && item.recipes.length > 0 && (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="hidden sm:inline-flex items-center cursor-default">
                  <Utensils className="h-3 w-3 mr-1 text-accent"/>
                  {item.recipes.length} recipe{item.recipes.length > 1 ? 's' : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs p-2 bg-popover text-popover-foreground rounded-md shadow-lg">
                <p className="font-semibold mb-1">Needed for:</p>
                <ul className="list-disc list-inside">
                  {item.recipes.slice(0,5).map(r => <li key={r.recipeId}>{r.recipeName}</li>)}
                  {item.recipes.length > 5 && <li>...and {item.recipes.length - 5} more</li>}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span className={cn("text-sm text-right", item.purchased ? "text-muted-foreground" : "text-foreground/80")} style={{minWidth: '80px'}}>
          {formattedQuantity} {finalDisplayUnit}
        </span>
      </div>
    </div>
  );
}
