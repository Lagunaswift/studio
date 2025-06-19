
import Image from 'next/image';
import type { Recipe } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Flame, Info, Heart, PlusCircle, Beef, Wheat, Droplets } from 'lucide-react'; // Added Beef, Wheat, Droplets
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

interface RecipeCardProps {
  recipe: Recipe;
  onAddToMealPlan?: (recipe: Recipe) => void;
  showAddToMealPlanButton?: boolean;
  showViewDetailsButton?: boolean;
  className?: string;
}

export function RecipeCard({
  recipe,
  onAddToMealPlan,
  showAddToMealPlanButton = false,
  showViewDetailsButton = true,
  className
}: RecipeCardProps) {
  const { toggleFavoriteRecipe, isRecipeFavorite } = useAppContext();
  
  const defaultPlaceholder = `https://placehold.co/600x400/007bff/ffffff.png?text=Recipe+ID+${recipe?.id || 'Unknown'}`;
  const [imageSrc, setImageSrc] = useState(recipe?.image || defaultPlaceholder);
  const [imageError, setImageError] = useState(!recipe?.image); 

  const isFavorited = recipe ? isRecipeFavorite(recipe.id) : false;

  useEffect(() => {
    if (recipe && recipe.image) {
      setImageSrc(recipe.image);
      setImageError(false); 
    } else if (recipe) {
      setImageSrc(defaultPlaceholder);
      setImageError(true);
    } else {
      setImageSrc(`https://placehold.co/600x400.png`); // General placeholder if no recipe
      setImageError(true);
    }
  }, [recipe, defaultPlaceholder]);


  if (!recipe) {
    return (
      <Card className={cn("flex flex-col overflow-hidden shadow-lg rounded-lg h-full items-center justify-center p-4", className)}>
        <CardContent>
          <p className="text-muted-foreground">No recipe data.</p>
        </CardContent>
      </Card>
    );
  }
  
  const handleImageError = () => {
    setImageSrc(defaultPlaceholder);
    setImageError(true);
  };
  
  const aiHint = recipe.tags && recipe.tags.length > 0 
    ? recipe.tags.slice(0, 2).join(' ') 
    : "food meal";

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    toggleFavoriteRecipe(recipe.id);
  };

  return (
    <Card className={cn("flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg h-full group", className)}>
      <div className="relative w-full h-60">
        <Image
          src={imageSrc} 
          alt={recipe.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          data-ai-hint={imageError ? aiHint : undefined}
          onError={handleImageError} 
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 bg-background/70 hover:bg-background/90 text-primary hover:text-accent"
          onClick={handleFavoriteToggle}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("w-5 h-5", isFavorited ? "fill-accent text-accent" : "text-muted-foreground")} />
        </Button>
      </div>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="font-headline text-lg md:text-xl text-primary group-hover:text-accent transition-colors">{recipe.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow px-4 py-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground mb-2">
          <div className="flex items-center">
            <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1.5 text-accent" />
            <span>Prep: {recipe.prepTime}, Cook: {recipe.cookTime}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-3 h-3 md:w-4 md:h-4 mr-1.5 text-accent" />
            <span>Serves: {recipe.servings}</span>
          </div>
          <div className="flex items-center">
            <Flame className="w-3 h-3 md:w-4 md:h-4 mr-1.5 text-red-500" />
            <span>{recipe.macrosPerServing.calories.toFixed(0)} kcal</span>
          </div>
           <div className="flex items-center">
            <Beef className="w-3 h-3 md:w-4 md:h-4 mr-1.5 text-blue-500" />
            <span>{recipe.macrosPerServing.protein.toFixed(0)}g P</span>
          </div>
          <div className="flex items-center">
            <Wheat className="w-3 h-3 md:w-4 md:h-4 mr-1.5 text-green-500" />
            <span>{recipe.macrosPerServing.carbs.toFixed(0)}g C</span>
          </div>
          <div className="flex items-center">
            <Droplets className="w-3 h-3 md:w-4 md:h-4 mr-1.5 text-yellow-500" />
            <span>{recipe.macrosPerServing.fat.toFixed(0)}g F</span>
          </div>
        </div>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">{tag}</Badge>
            ))}
            {recipe.tags.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0.5">+{recipe.tags.length - 3}</Badge>}
          </div>
        )}
      </CardContent>
      {(showViewDetailsButton || (showAddToMealPlanButton && onAddToMealPlan)) && (
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-2 p-4 border-t mt-auto">
          {showViewDetailsButton && (
             <Button variant="outline" size="sm" asChild className="w-full sm:w-auto text-xs md:text-sm">
               <Link href={`/recipes/${recipe.id}`}>
                 <Info className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" /> View Details
               </Link>
             </Button>
          )}
          {showAddToMealPlanButton && onAddToMealPlan && (
            <Button onClick={() => onAddToMealPlan(recipe)} size="sm" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-xs md:text-sm">
              <PlusCircle className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" /> Add to Plan
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
