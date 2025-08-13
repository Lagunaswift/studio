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
  Beef, 
  Wheat, 
  Droplets,
  Heart,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteToggle?: () => void;
  isFavorited?: boolean;
  pantryMatchStatus?: 'make' | 'almost' | 'missing';
  className?: string;
}

export function RecipeCard({ 
  recipe, 
  onFavoriteToggle, 
  isFavorited = false, 
  pantryMatchStatus,
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

        {/* Macro Summary Row - FIXED to use individual macro properties */}
        {(macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-muted/30">
            <span className="font-medium">Per serving:</span>
            <span>
              {macros.protein.toFixed(0)}P • {macros.carbs.toFixed(0)}C • {macros.fat.toFixed(0)}F
            </span>
          </div>
        )}

        {/* Tags Preview */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{recipe.tags.length - 3}
              </Badge>
            )}
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
            {/* Detailed Macros - FIXED to use individual macro properties */}
            {(macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Nutrition per serving:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>Calories</span>
                    </div>
                    <span className="font-medium">{macros.calories.toFixed(0)} kcal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Beef className="w-4 h-4 text-red-500" />
                      <span>Protein</span>
                    </div>
                    <span className="font-medium">{macros.protein.toFixed(0)}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-amber-500" />
                      <span>Carbs</span>
                    </div>
                    <span className="font-medium">{macros.carbs.toFixed(0)}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span>Fat</span>
                    </div>
                    <span className="font-medium">{macros.fat.toFixed(0)}g</span>
                  </div>
                </div>
              </div>
            )}
            
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
            {recipe.tags && recipe.tags.length > 3 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">All tags:</h4>
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
                  {recipe.ingredients.length} ingredients required
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
