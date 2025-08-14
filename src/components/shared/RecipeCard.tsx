// src/components/shared/RecipeCard.tsx
// FIXED VERSION for your actual data structure

"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Clock, 
  Users, 
  ChefHat, 
  ChevronDown, 
  ChevronUp, 
  Flame,
  Heart,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Recipe, PantryItem } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteToggle?: () => void;
  isFavorited?: boolean;
  pantryMatchStatus?: 'make' | 'almost' | 'missing';
  pantryItems?: PantryItem[];
  className?: string;
}

export function RecipeCard({ 
  recipe, 
  onFavoriteToggle, 
  isFavorited = false, 
  pantryMatchStatus,
  pantryItems = [],
  className 
}: RecipeCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // **FIXED: Helper function to get macros from your actual data structure**
  const getMacros = () => {
    // Your data has individual properties: calories, protein, carbs, fat
    return {
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0
    };
  };
  
  const macros = getMacros();
  
  // Calculate ingredients that need to be bought
  const calculateIngredientsToBuy = () => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 0;
    }
    
    if (!pantryItems.length) {
      return recipe.ingredients.length;
    }
    
    const pantryIngredientNames = pantryItems.map(p => p.name.toLowerCase().trim());
    let ingredientsToBuy = 0;

    recipe.ingredients.forEach(ingredient => {
      if (!ingredient) {
        return;
      }
      
      // Handle both string ingredients and parsed ingredient objects
      let ingredientName: string;
      if (typeof ingredient === 'string') {
        ingredientName = ingredient;
      } else if (typeof ingredient === 'object' && 'name' in ingredient) {
        ingredientName = (ingredient as any).name;
      } else {
        return; // Skip invalid ingredients
      }
      
      const ingredientNameLower = ingredientName.toLowerCase().trim();
      
      // More precise matching: only match if pantry item name is contained in ingredient name
      // or if they are exactly the same (but not the reverse)
      const isInPantry = pantryIngredientNames.some(pName => 
        ingredientNameLower === pName || 
        ingredientNameLower.includes(pName)
      );
      
      if (!isInPantry) {
        ingredientsToBuy++;
      }
    });

    return ingredientsToBuy;
  };
  
  const ingredientsToBuy = calculateIngredientsToBuy();
  
  // **STANDARDIZED IMAGE LOADING PATTERN**
  const getImageSrc = () => {
    if (imageError) {
      return '/placeholder-recipe.jpg';
    }
    return `/images/${recipe.id}.jpg`;
  };
  
  const handleImageError = () => {
    console.log(`Image not found for recipe ${recipe.id}, falling back to placeholder`);
    setImageError(true);
  };
  
  return (
    <Card className={cn(
      "group hover:shadow-lg transition-all duration-200 overflow-hidden w-full max-w-full", 
      className
    )}>
      {/* Recipe Image & Basic Info */}
      <div className="relative w-full">
        <Image 
          src={getImageSrc()}
          alt={recipe.name}
          width={400}
          height={200}
          className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-200"
          onError={handleImageError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
        
        {/* Favorite Button */}
        {onFavoriteToggle && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 bg-background/70 hover:bg-background/90 text-primary hover:text-accent p-2 rounded-full shadow-md z-10 h-8 w-8 sm:h-10 sm:w-10"
            onClick={onFavoriteToggle}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", isFavorited ? "fill-accent text-accent" : "text-muted-foreground")} />
          </Button>
        )}
        
        {/* Pantry Match Badge */}
        {pantryMatchStatus && (
          <Badge 
            variant="secondary" 
            className={cn(
              "absolute top-2 left-2 z-10 text-xs px-2 py-1",
              pantryMatchStatus === 'make' && "bg-green-100 text-green-800 border-green-300",
              pantryMatchStatus === 'almost' && "bg-yellow-100 text-yellow-800 border-yellow-300"
            )}
          >
            {pantryMatchStatus === 'make' ? 'Can Make!' : 'Almost'}
          </Badge>
        )}
      </div>

      <CardHeader className="p-4">
        <CardTitle className="text-lg font-semibold text-primary line-clamp-2">
          {recipe.name}
        </CardTitle>
        
        {/* Quick Info Row - FIXED to use individual macro properties */}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{recipe.servings}</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3" />
            <span>{macros.calories} cal</span>
          </div>
        </div>

        {/* Detailed Macro Display - Main focus on macros */}
        {(macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
          <div className="mt-3 p-3 bg-muted/20 rounded-lg border border-muted/30">
            <div className="text-xs text-muted-foreground mb-2 text-center">Nutrition per serving</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-accent">{macros.calories}</div>
                <div className="text-xs text-muted-foreground">cal</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-accent">{macros.protein.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">protein</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-accent">{macros.carbs.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">carbs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-accent">{macros.fat.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">fat</div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Expandable Details */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 pt-0">
            <span className="text-sm font-medium">
              {isDetailsOpen ? 'Hide Details' : 'Show Details'}
            </span>
            {isDetailsOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          <CardContent className="p-0 space-y-4">
            
            {/* Timing Details */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Prep time:</span>
                <span className="font-medium">{recipe.prepTime}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Cook time:</span>
                <span className="font-medium">{recipe.cookTime}</span>
              </div>
              {recipe.chillTime && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Chill time:</span>
                  <span className="font-medium">{recipe.chillTime}</span>
                </div>
              )}
            </div>
            
            {/* Description */}
            {recipe.description && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Description:</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {recipe.description}
                </p>
              </div>
            )}
            
            {/* All Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Tags:</h4>
                <div className="flex flex-wrap gap-1">
                  {recipe.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ingredient Count Preview */}
            {recipe.ingredients && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Ingredients:</h4>
                <p className="text-sm text-muted-foreground">
                  {ingredientsToBuy === 0 
                    ? "All ingredients in pantry!" 
                    : `Need to buy ${ingredientsToBuy} ingredient${ingredientsToBuy !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
