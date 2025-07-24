"use client";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Utensils } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
export function ShoppingListItemComponent({ item, onToggle }) {
    const formattedQuantity = typeof item.quantity === 'number'
        ? (Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1).replace(/\.0$/, ''))
        : item.quantity;
    return (<div className={cn("flex items-center justify-between p-3 rounded-md transition-all duration-200", item.purchased ? "bg-muted/50 opacity-60" : "bg-card hover:bg-secondary/50")}>
      <div className="flex items-center space-x-3">
        <Checkbox id={`item-${item.id}`} checked={item.purchased} onCheckedChange={() => onToggle(item.id)} aria-label={`Mark ${item.name} as ${item.purchased ? 'not purchased' : 'purchased'}`}/>
        <label htmlFor={`item-${item.id}`} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", item.purchased ? "line-through text-muted-foreground" : "text-foreground")}>
          {item.name}
        </label>
      </div>
      <div className="flex items-center space-x-3">
        {item.recipes && item.recipes.length > 0 && (<TooltipProvider>
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
                  {item.recipes.slice(0, 5).map(r => <li key={r.recipeId}>{r.recipeName}</li>)}
                  {item.recipes.length > 5 && <li>...and {item.recipes.length - 5} more</li>}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>)}
        <span className={cn("text-sm text-right", item.purchased ? "text-muted-foreground" : "text-foreground/80")} style={{ minWidth: '80px' }}>
          {formattedQuantity} {item.unit}
        </span>
      </div>
    </div>);
}
