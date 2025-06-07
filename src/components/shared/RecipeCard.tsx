import Image from 'next/image';
import type { Recipe } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Flame, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface RecipeCardProps {
  recipe: Recipe;
  onAddToMealPlan?: (recipe: Recipe) => void;
  showAddToMealPlanButton?: boolean;
  showViewDetailsButton?: boolean;
}

export function RecipeCard({ recipe, onAddToMealPlan, showAddToMealPlanButton = false, showViewDetailsButton = true }: RecipeCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg h-full">
      <div className="relative w-full h-48">
        <Image
          // @ts-ignore next-line
          src={recipe['data-ai-hint'] ? `${recipe.image}?text=${recipe['data-ai-hint']}` : recipe.image}
          alt={recipe.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          // @ts-ignore next-line
          data-ai-hint={recipe['data-ai-hint'] || recipe.name.toLowerCase().split(" ").slice(0,2).join(" ")}
        />
      </div>
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary">{recipe.name}</CardTitle>
        <CardDescription className="h-10 overflow-hidden text-ellipsis">{recipe.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-accent" />
            <span>Prep: {recipe.prepTime}, Cook: {recipe.cookTime}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-accent" />
            <span>Serves: {recipe.servings}</span>
          </div>
          <div className="flex items-center">
            <Flame className="w-4 h-4 mr-2 text-accent" />
            <span>{recipe.macrosPerServing.calories.toFixed(0)} kcal per serving</span>
          </div>
        </div>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
        {showViewDetailsButton && (
           <Button variant="outline" asChild className="w-full sm:w-auto">
             <Link href={`/recipes/${recipe.id}`}>
               <Info className="mr-2 h-4 w-4" /> View Details
             </Link>
           </Button>
        )}
        {showAddToMealPlanButton && onAddToMealPlan && (
          <Button onClick={() => onAddToMealPlan(recipe)} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            Add to Meal Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
