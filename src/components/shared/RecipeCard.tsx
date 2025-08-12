
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
    <Card className={cn("group hover:shadow-lg transition-all duration-200 overflow-hidden", className)}>
      {/* Recipe Image & Basic Info */}
      <div className="relative">
        <img 
          src={imageError ? '/placeholder-recipe.jpg' : recipe.image}
          alt={recipe.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
          onError={handleImageError}
        />
        
        {/* Favorite Button */}
        {onFavoriteToggle && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 bg-background/70 hover:bg-background/90 text-primary hover:text-accent p-2 rounded-full shadow-md z-10"
            onClick={onFavoriteToggle}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("w-5 h-5", isFavorited ? "fill-accent text-accent" : "text-muted-foreground")} />
          </Button>
        )}
        
        {/* Pantry Match Badge */}
        {pantryMatchStatus && (
          <Badge 
            variant="secondary" 
            className={cn(
              "absolute top-2 left-2 z-10",
              pantryMatchStatus === 'make' && "bg-green-100 text-green-800 border-green-300",
              pantryMatchStatus === 'almost' && "bg-yellow-100 text-yellow-800 border-yellow-300"
            )}
          >
            {pantryMatchStatus === 'make' ? '✓ Can Make' : '⚠ Almost'}
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="font-headline text-lg text-primary group-hover:text-accent transition-colors line-clamp-2">
          {recipe.name}
        </CardTitle>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-accent" />
            <span>{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-accent" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-2">
        {/* Basic Macro Display */}
        {recipe.macrosPerServing && (
          <div className="flex justify-between items-center text-sm mb-3">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-primary" />
              <span className="font-medium">{recipe.macrosPerServing.calories.toFixed(0)}kcal</span>
            </div>
            <div className="text-muted-foreground">
              {recipe.macrosPerServing.protein.toFixed(0)}P • {recipe.macrosPerServing.carbs.toFixed(0)}C • {recipe.macrosPerServing.fat.toFixed(0)}F
            </div>
          </div>
        )}
        
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{recipe.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Collapsible More Details Section */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto text-sm font-medium hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                More Details
              </span>
              {isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 pt-3 border-t">
            {/* Detailed Macro Breakdown */}
            {recipe.macrosPerServing && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Nutrition per serving:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-primary" />
                      <span>Calories</span>
                    </div>
                    <span className="font-medium">{recipe.macrosPerServing.calories.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Beef className="w-4 h-4 text-chart-1" />
                      <span>Protein</span>
                    </div>
                    <span className="font-medium">{recipe.macrosPerServing.protein.toFixed(0)}g</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-chart-2" />
                      <span>Carbs</span>
                    </div>
                    <span className="font-medium">{recipe.macrosPerServing.carbs.toFixed(0)}g</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-accent" />
                      <span>Fat</span>
                    </div>
                    <span className="font-medium">{recipe.macrosPerServing.fat.toFixed(0)}g</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Detailed Timing */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-primary">Timing:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Prep time:</span>
                  <span className="font-medium">{recipe.prepTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cook time:</span>
                  <span className="font-medium">{recipe.cookTime}</span>
                </div>
                {recipe.chillTime && (
                  <div className="flex justify-between">
                    <span>Chill time:</span>
                    <span className="font-medium">{recipe.chillTime}</span>
                  </div>
                )}
              </div>
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
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
