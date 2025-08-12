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
  
  // **STANDARDIZED IMAGE LOADING PATTERN**
  // Priority: 1. public/images/{recipe.id}.jpg 2. recipe.imageUrl (legacy) 3. placeholder
  const getImageSrc = () => {
    if (imageError) {
      return '/placeholder-recipe.jpg';
    }
    
    // Always try public/images/{id}.jpg first for consistency
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
        
        {/* Quick Info Row */}
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
            <span>{recipe.macrosPerServing?.calories || 0} cal</span>
          </div>
        </div>

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
            {/* Macros */}
            {recipe.macrosPerServing && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
                  <Flame className="w-4 h-4 text-orange-500 mb-1" />
                  <span className="text-xs font-medium">{recipe.macrosPerServing.calories}</span>
                  <span className="text-xs text-muted-foreground">cal</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
                  <Beef className="w-4 h-4 text-red-500 mb-1" />
                  <span className="text-xs font-medium">{recipe.macrosPerServing.protein}g</span>
                  <span className="text-xs text-muted-foreground">protein</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
                  <Wheat className="w-4 h-4 text-amber-500 mb-1" />
                  <span className="text-xs font-medium">{recipe.macrosPerServing.carbs}g</span>
                  <span className="text-xs text-muted-foreground">carbs</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded">
                  <Droplets className="w-4 h-4 text-blue-500 mb-1" />
                  <span className="text-xs font-medium">{recipe.macrosPerServing.fat}g</span>
                  <span className="text-xs text-muted-foreground">fat</span>
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
