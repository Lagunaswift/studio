'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SuggestRecipesByIngredientsInputSchema, SuggestRecipesByIngredientsOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';

export const suggestRecipesByIngredientsFlow = ai.defineFlow(
  {
    name: 'suggestRecipesByIngredientsFlow',
    inputSchema: SuggestRecipesByIngredientsInputSchema,
    outputSchema: SuggestRecipesByIngredientsOutputSchema,
  },
  async (input: z.infer<typeof SuggestRecipesByIngredientsInputSchema>) => {
    // Enhanced input validation
    if (!input.userIngredients || input.userIngredients.length === 0) {
      throw new Error("User ingredients list cannot be empty.");
    }
    if (!input.availableRecipes || input.availableRecipes.length === 0) {
      throw new Error("Available recipes list cannot be empty.");
    }
    
    // Validate maxResults bounds
    const maxResults = input.maxResults || 3;
    if (maxResults < 1 || maxResults > 50) {
      throw new Error("maxResults must be between 1 and 50.");
    }

    const promptInput = {
      ...input,
      dietaryPreferences: input.dietaryPreferences || [],
      allergens: input.allergens || [],
      maxResults,
    };

    try {
      // FIXED: Correct Genkit prompt invocation with structured output
      const response = await ai.prompt('suggestRecipesByIngredients')(promptInput);

      if (!response) {
        throw new Error("AI failed to generate recipe suggestions.");
      }

      // For Genkit prompts with output schema, the structured data is typically in response.output
      // Since the prompt is configured with SuggestRecipesByIngredientsOutputSchema, 
      // Genkit should return the data in the correct format
      const output = response.output || response;

      // Validate that we have the expected structure
      if (!output || typeof output !== 'object') {
        throw new Error("Invalid response format from AI prompt.");
      }

      // Since the prompt is configured with the output schema, 
      // Genkit should already validate the structure, but we can add a safety check
      if (!('suggestedRecipes' in output)) {
        throw new Error("AI response missing required 'suggestedRecipes' property.");
      }

      // The response should already conform to our schema since it's configured in the prompt
      // But we can optionally validate it for extra safety
      return SuggestRecipesByIngredientsOutputSchema.parse(output);
      
    } catch (error) {
      // Enhanced error handling with more context
      console.error('Recipe suggestion generation failed:', error);
      
      // If it's a Zod validation error, provide more specific feedback
      if (error instanceof z.ZodError) {
        console.error('Schema validation failed:', error.errors);
        throw new Error(`Response format validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      
      throw new Error(`Failed to generate recipe suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

export const suggestRecipesByIngredients = onCallGenkit(
  {},
  suggestRecipesByIngredientsFlow
);