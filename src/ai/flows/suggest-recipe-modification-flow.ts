//src/ai/flows/suggest-recipe-modification-flow.ts
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SuggestRecipeModificationInputSchema, SuggestRecipeModificationOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';

export const suggestRecipeModificationFlow = ai.defineFlow(
  {
    name: 'suggestRecipeModificationFlow',
    inputSchema: SuggestRecipeModificationInputSchema,
    outputSchema: SuggestRecipeModificationOutputSchema,
  },
  async (input: z.infer<typeof SuggestRecipeModificationInputSchema>) => {
    if (!input.recipeToModify || !input.userRequest) {
      throw new Error("A recipe and a modification request are required.");
    }
    const prompt = ai.prompt('suggestRecipeModification');
    const { output } = await prompt.run(input);
    if (!output) {
      throw new Error('AI failed to generate a recipe modification.');
    }
    return output;
  }
);

export const suggestRecipeModification = onCallGenkit(
  {},
  suggestRecipeModificationFlow
);
