
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

// Helper function for store-friendly quantities - ENHANCED
const getStoreFriendlyDisplay = (
  itemName: string,
  aggregatedQuantity: number,
  aggregatedUnit: string
): { displayQuantity: string | number; displayUnit: string } => {
  const lowerItemName = itemName.toLowerCase();
  const lowerAggregatedUnit = aggregatedUnit.toLowerCase();

  // Existing logic
  if (lowerItemName.includes("egg")) {
    if (aggregatedQuantity <= 6 && (lowerAggregatedUnit === 'egg' || lowerAggregatedUnit === 'item(s)')) return { displayQuantity: 1, displayUnit: "box of 6" };
    if (aggregatedQuantity <= 12 && (lowerAggregatedUnit === 'egg' || lowerAggregatedUnit === 'item(s)')) return { displayQuantity: 1, displayUnit: "box of 12" };
    if (lowerAggregatedUnit === 'egg' || lowerAggregatedUnit === 'item(s)') return { displayQuantity: Math.ceil(aggregatedQuantity / 12), displayUnit: "boxes of 12" };
  }

  if (lowerItemName.includes("yogurt") || lowerItemName.includes("yoghurt") || lowerItemName.includes("cottage cheese")) {
    if (lowerAggregatedUnit === "g") {
      if (aggregatedQuantity <= 200) return { displayQuantity: 1, displayUnit: "200g pot" };
      if (aggregatedQuantity <= 500) return { displayQuantity: 1, displayUnit: "500g pot" };
      if (aggregatedQuantity <= 1000) return { displayQuantity: 1, displayUnit: "1kg tub" };
      return { displayQuantity: Math.ceil(aggregatedQuantity / 500), displayUnit: "x 500g pots/tubs" };
    }
  }
  
  if (lowerItemName.includes("milk") || lowerItemName.includes("soy milk") || lowerItemName.includes("almond milk") || lowerItemName.includes("oat milk")) {
      if (lowerAggregatedUnit === "ml") {
          if (aggregatedQuantity <= 1000) return {displayQuantity: 1, displayUnit: "1L carton"};
          return {displayQuantity: Math.ceil(aggregatedQuantity/1000), displayUnit: "x 1L cartons"};
      }
      if (lowerAggregatedUnit === "l") {
          return {displayQuantity: Math.ceil(aggregatedQuantity), displayUnit: "x 1L cartons"};
      }
  }

  if (lowerItemName.includes("chicken breast")) {
    if (lowerAggregatedUnit === "g") {
        const numBreasts = Math.ceil(aggregatedQuantity / 180); // Assuming average breast ~180g
        return { displayQuantity: numBreasts, displayUnit: `breast(s) (approx ${numBreasts*180}g pack)`};
    }
  }

  // --- NEW UK Supermarket Friendly Logic ---

  // Coconut Oil
  if (lowerItemName.includes("coconut oil")) {
    if ((lowerAggregatedUnit === "tbsp" && aggregatedQuantity <= 10) || // up to ~140g
        (lowerAggregatedUnit === "g" && aggregatedQuantity <= 150) ||
        (lowerAggregatedUnit === "ml" && aggregatedQuantity <= 150)) { // Approx density
      return { displayQuantity: 1, displayUnit: "jar (approx 250-300g)" };
    }
  }

  // Olive Oil / Other Cooking Oils (sunflower, vegetable - excluding sesame)
  if (lowerItemName.includes("oil") && !lowerItemName.includes("coconut oil") && !lowerItemName.includes("sesame oil")) {
    if ((lowerAggregatedUnit === "tbsp" && aggregatedQuantity <= 30) || // ~420-450ml
        (lowerAggregatedUnit === "ml" && aggregatedQuantity <= 500) ||
        (lowerAggregatedUnit === "l" && aggregatedQuantity <= 0.5)) {
      return { displayQuantity: 1, displayUnit: "bottle (approx 0.5-1L)" };
    }
  }
  
  // Sesame Oil (often smaller bottles)
  if (lowerItemName.includes("sesame oil")) {
    if ((lowerAggregatedUnit === "tbsp" && aggregatedQuantity <= 10) || // ~140-150ml
        (lowerAggregatedUnit === "ml" && aggregatedQuantity <= 150)) {
        return { displayQuantity: 1, displayUnit: "small bottle" };
    }
  }

  // Flour (Plain, Self-raising, Spelt, Oat, Buckwheat, etc.)
  if (lowerItemName.includes("flour") || lowerItemName.includes("almond meal") || lowerItemName.includes("cornstarch") || lowerItemName.includes("potato starch")) {
    if (lowerAggregatedUnit === "g") {
      if (aggregatedQuantity <= 1000) return { displayQuantity: 1, displayUnit: "bag (approx 1kg)" };
      if (aggregatedQuantity <= 1500) return { displayQuantity: 1, displayUnit: "bag (approx 1.5kg)" };
    }
    // If in cups, direct conversion is tricky. A simple check: 1 cup flour ~120-150g.
    if (lowerAggregatedUnit === "cup" && (aggregatedQuantity * 150) <= 1000) {
         return { displayQuantity: 1, displayUnit: "bag (approx 1kg)" };
    }
  }
  
  // Sugar (Granulated, Caster, Coconut, Brown)
  if (lowerItemName.includes("sugar")) {
    if (lowerAggregatedUnit === "g") {
      if (aggregatedQuantity <= 1000) return { displayQuantity: 1, displayUnit: "bag (approx 1kg)" };
    }
    if (lowerAggregatedUnit === "cup" && (aggregatedQuantity * 200) <= 1000) { // 1 cup sugar ~200g
         return { displayQuantity: 1, displayUnit: "bag (approx 1kg)" };
    }
  }

  // Rice / Pasta / Noodles / Couscous / Quinoa / Oats etc. (if by weight)
  const grains = ["rice", "pasta", "noodles", "couscous", "quinoa", "oats", "millet", "buckwheat groats", "rolled oats", "oatmeal"];
  if (grains.some(grain => lowerItemName.includes(grain)) && lowerAggregatedUnit === "g") {
      if (aggregatedQuantity <= 500) return { displayQuantity: 1, displayUnit: "bag/box (approx 500g)" };
      if (aggregatedQuantity <= 1000) return { displayQuantity: 1, displayUnit: "bag/box (approx 1kg)" };
      // For larger, it might be multiple packs, e.g. Math.ceil(aggregatedQuantity/1000) + "x 1kg bags"
  }
  
  // Canned goods (tomatoes, beans, chickpeas, sweetcorn, lentils, coconut milk (canned))
  const cannedGoods = ["tomatoes", "beans", "chickpeas", "sweetcorn", "lentils", "coconut milk"];
  if (cannedGoods.some(good => lowerItemName.includes(good))) {
    if (lowerAggregatedUnit === "g" && aggregatedQuantity > 150 && aggregatedQuantity <= 450) { // Typical can ~400g
        return { displayQuantity: Math.ceil(aggregatedQuantity / 400), displayUnit: "can(s) (approx 400g each)" };
    }
    if (lowerAggregatedUnit === "ml" && lowerItemName.includes("coconut milk") && aggregatedQuantity > 100 && aggregatedQuantity <= 450) { // Coconut milk can ~400ml
        return { displayQuantity: Math.ceil(aggregatedQuantity / 400), displayUnit: "can(s) (approx 400ml each)" };
    }
    if (lowerAggregatedUnit === "can" || lowerAggregatedUnit === "cans") { // Already store friendly
        return {displayQuantity: aggregatedQuantity, displayUnit: aggregatedUnit};
    }
  }

  // Spices (e.g. paprika, cumin, turmeric, dried ginger, dried coriander, curry powder, chili powder, five spice)
  const commonSpices = ["paprika", "cumin", "turmeric", "ginger", "coriander", "curry powder", "chili powder", "chinese five spice", "mixed herbs", "oregano", "thyme", "basil dried", "cinnamon", "nutmeg", "cloves", "garlic powder", "onion powder", "saffron", "za'atar"];
  if (commonSpices.some(spice => lowerItemName.includes(spice.replace(/ powder| dried| ground/g, "")))) { // Try to match base spice name
      if ((lowerAggregatedUnit === "tsp" && aggregatedQuantity <= 6) ||
          (lowerAggregatedUnit === "tbsp" && aggregatedQuantity <= 2)) {
          return { displayQuantity: 1, displayUnit: "jar/packet" };
      }
  }

  // Default: return original aggregated quantity and unit
  return { displayQuantity: aggregatedQuantity, displayUnit: aggregatedUnit };
};


export function ShoppingListItemComponent({ item, onToggle, isStoreFriendlyMode }: ShoppingListItemProps) {
  let finalDisplayQuantity: string | number = item.quantity;
  let finalDisplayUnit: string = item.unit;

  if (isStoreFriendlyMode) {
    const storeFriendly = getStoreFriendlyDisplay(item.name, item.quantity, item.unit);
    finalDisplayQuantity = storeFriendly.displayQuantity;
    finalDisplayUnit = storeFriendly.displayUnit;
  }
  
  const formattedQuantity = typeof finalDisplayQuantity === 'number'
    ? (Number.isInteger(finalDisplayQuantity) ? finalDisplayQuantity : finalDisplayQuantity.toFixed(1).replace(/\.0$/, '')) // remove .0
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

