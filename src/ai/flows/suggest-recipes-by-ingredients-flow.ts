
import { z } from 'zod';
import { suggestRecipesByIngredients as suggestRecipesByIngredientsPrompt } from './suggestRecipesByIngredients.prompt';
import { SuggestRecipesByIngredientsInputSchema, SuggestRecipesByIngredientsOutputSchema, RecipeWithIngredientsSchema } from './schemas';

export async function suggestRecipesByIngredients(input: z.infer<typeof SuggestRecipesByIngredientsInputSchema>) {
  const result = await suggestRecipesByIngredientsPrompt.generate({
    input,
  });

  return result.output;
}

export type SuggestRecipesByIngredientsInput = z.infer<typeof SuggestRecipesByIngredientsInputSchema>;
export type SuggestRecipesByIngredientsOutput = z.infer<typeof SuggestRecipesByIngredientsOutputSchema>;
export type RecipeWithIngredients = z.infer<typeof RecipeWithIngredientsSchema>;
