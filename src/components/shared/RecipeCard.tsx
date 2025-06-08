
import Image from 'next/image';
import type { Recipe } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Flame, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  if (!recipe) { // Add a guard clause for undefined recipe
    return (
      <Card className={cn("flex flex-col overflow-hidden shadow-lg rounded-lg h-full items-center justify-center p-4", className)}>
        <CardContent>
          <p className="text-muted-foreground">No recipe to display.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className={cn("flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg h-full", className)}>
      <div className="relative w-full h-60"> {/* Changed h-48 to h-60 */}
        <Image
          src={recipe.image}
          alt={recipe.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          data-ai-hint={recipe.tags ? recipe.tags.slice(0,2).join(' ') : "food meal"}
        />
      </div>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="font-headline text-lg md:text-xl text-primary">{recipe.name}</CardTitle>
        {recipe.description && <CardDescription className="h-10 overflow-hidden text-ellipsis text-xs md:text-sm">{recipe.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow px-4 py-2">
        <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-3 h-3 md:w-4 md:h-4 mr-2 text-accent" />
            <span>Prep: {recipe.prepTime}, Cook: {recipe.cookTime}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-3 h-3 md:w-4 md:h-4 mr-2 text-accent" />
            <span>Serves: {recipe.servings}</span>
          </div>
          <div className="flex items-center">
            <Flame className="w-3 h-3 md:w-4 md:h-4 mr-2 text-accent" />
            <span>{recipe.macrosPerServing.calories.toFixed(0)} kcal</span>
          </div>
        </div>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">{tag}</Badge>
            ))}
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
              Add to Meal Plan
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

    