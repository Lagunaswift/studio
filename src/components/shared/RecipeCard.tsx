
// src/components/shared/RecipeCard.tsx

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
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    <Card className={cn(
      "group hover:shadow-lg transition-all duration-200 overflow-hidden w-full max-w-full", 
      className
    )}>
      {/* Recipe Image & Basic Info */}
      <div className="relative w-full">
        <img 
          src={imageError ? '/placeholder-recipe.jpg' : recipe.image}
          alt={recipe.name}
          className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-200"
          onError={handleImageError}
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
            {pantryMatchStatus === 'make' ? '✓ Can Make' : '⚠ Almost'}
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
        {/* Recipe Title with proper truncation */}
        <CardTitle className="font-headline text-primary group-hover:text-accent transition-colors min-h-0 overflow-hidden">
          <div 
            className="text-base sm:text-lg leading-tight break-words"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              hyphens: 'auto'
            }}
            title={recipe.name}
          >
            {recipe.name}
          </div>
        </CardTitle>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-accent shrink-0" />
            <span className="truncate">{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-accent shrink-0" />
            <span className="truncate">{recipe.servings} servings</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-3 py-2 sm:px-4 overflow-hidden">
        {/* Basic Macro Display */}
        {recipe.macrosPerServing && (
          <div className="flex justify-between items-center text-xs sm:text-sm mb-3 gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="font-medium truncate">{recipe.macrosPerServing.calories.toFixed(0)}kcal</span>
            </div>
            <div className="text-muted-foreground text-xs truncate flex-shrink-0">
              {recipe.macrosPerServing.protein.toFixed(0)}P • {recipe.macrosPerServing.carbs.toFixed(0)}C • {recipe.macrosPerServing.fat.toFixed(0)}F
            </div>
          </div>
        )}
        
        {/* Tags with responsive display */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 overflow-hidden">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs truncate max-w-full">
                <span className="truncate">{tag}</span>
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{recipe.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Collapsible More Details Section */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto text-xs sm:text-sm font-medium hover:bg-muted/50 min-h-0"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Info className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">More Details</span>
              </span>
              <span className="shrink-0 ml-2">
                {isDetailsOpen ? (
                  <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </span>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 pt-3 border-t">
            {/* Detailed Macro Breakdown */}
            {recipe.macrosPerServing && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-primary">Nutrition per serving:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
                      <span className="truncate">Calories</span>
                    </div>
                    <span className="font-medium shrink-0 ml-1">{recipe.macrosPerServing.calories.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Beef className="w-3 h-3 sm:w-4 sm:h-4 text-chart-1 shrink-0" />
                      <span className="truncate">Protein</span>
                    </div>
                    <span className="font-medium shrink-0 ml-1">{recipe.macrosPerServing.protein.toFixed(0)}g</span>
                  </div>
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Wheat className="w-3 h-3 sm:w-4 sm:h-4 text-chart-2 shrink-0" />
                      <span className="truncate">Carbs</span>
                    </div>
                    <span className="font-medium shrink-0 ml-1">{recipe.macrosPerServing.carbs.toFixed(0)}g</span>
                  </div>
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Droplets className="w-3 h-3 sm:w-4 sm:h-4 text-accent shrink-0" />
                      <span className="truncate">Fat</span>
                    </div>
                    <span className="font-medium shrink-0 ml-1">{recipe.macrosPerServing.fat.toFixed(0)}g</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Detailed Timing */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm text-primary">Timing:</h4>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="truncate">Prep time:</span>
                  <span className="font-medium shrink-0 ml-2">{recipe.prepTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="truncate">Cook time:</span>
                  <span className="font-medium shrink-0 ml-2">{recipe.cookTime}</span>
                </div>
                {recipe.chillTime && (
                  <div className="flex justify-between items-center">
                    <span className="truncate">Chill time:</span>
                    <span className="font-medium shrink-0 ml-2">{recipe.chillTime}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Description */}
            {recipe.description && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-primary">Description:</h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                  {recipe.description}
                </p>
              </div>
            )}
            
            {/* All Tags */}
            {recipe.tags && recipe.tags.length > 3 && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-primary">All tags:</h4>
                <div className="flex flex-wrap gap-1">
                  {recipe.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs truncate max-w-full">
                      <span className="truncate">{tag}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Ingredient Count Preview */}
            {recipe.ingredients && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-primary">Ingredients:</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {recipe.ingredients.length} ingredients required
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
