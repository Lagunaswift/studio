
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { SuggestRecipesByIngredientsInputSchema, SuggestRecipesByIngredientsOutputSchema, RecipeWithIngredientsSchema } from './schemas';

export async function suggestRecipesByIngredients(input: z.infer<typeof SuggestRecipesByIngredientsInputSchema>) {
  const prompt = ai.prompt('suggestRecipesByIngredients');
  
  const result = await prompt(input);

  return result.output;
}

export type SuggestRecipesByIngredientsInput = z.infer<typeof SuggestRecipesByIngredientsInputSchema>;
export type SuggestRecipesByIngredientsOutput = z.infer<typeof SuggestRecipesByIngredientsOutputSchema>;
export type RecipeWithIngredients = z.infer<typeof RecipeWithIngredientsSchema>;
