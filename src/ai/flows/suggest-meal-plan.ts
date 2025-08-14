//src/ai/flows/suggest-meal-plan.ts
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SuggestMealPlanInputSchema, SuggestMealPlanOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';
import { PlannedRecipeItem, RecipeForAI } from '@/types';

export const suggestMealPlanFlow = ai.defineFlow(
    {
        name: 'suggestMealPlanFlow',
        inputSchema: SuggestMealPlanInputSchema,
        outputSchema: SuggestMealPlanOutputSchema,
    },
    async (input: z.infer<typeof SuggestMealPlanInputSchema>) => {
        if (!input.mealStructure || input.mealStructure.length === 0) {
            throw new Error("Meal structure is required to generate a plan.");
        }
        if (!input.availableRecipes || input.availableRecipes.length === 0) {
            throw new Error("Available recipes are required to generate a plan.");
        }

        const promptInput = {
            ...input,
            macroTargets: input.macroTargets,
            dietaryPreferences: input.dietaryPreferences || [],
            allergens: input.allergens || [],
            currentDate: input.currentDate || new Date().toISOString().split('T')[0],
        };

        // Correctly retrieve the prompt object first
        const suggestMealPlanPrompt = ai.prompt('suggestMealPlan');
        
        // Invoke the executable prompt with the input
        const response = await suggestMealPlanPrompt(promptInput);

        const output = response.output; // Access output as a property

        if (!output) {
            throw new Error("AI failed to generate a meal plan output.");
        }

        const parsedOutput = SuggestMealPlanOutputSchema.safeParse(output);
        if (!parsedOutput.success) {
            throw new Error('Invalid output format from AI: ' + JSON.stringify(parsedOutput.error.flatten()));
        }

        if (parsedOutput.data.plannedMeals.length !== input.mealStructure.length) {
            console.warn("AI did not plan for all meal slots. Input slots:", input.mealStructure.length, "Planned meals:", parsedOutput.data.plannedMeals.length);
        }

        parsedOutput.data.plannedMeals = parsedOutput.data.plannedMeals.map((meal: PlannedRecipeItem) => {
            if (meal.servings <= 0) {
                console.warn(`AI generated non-positive servings (${meal.servings}) for ${meal.recipeName}. Setting to 0.25.`);
                const originalRecipe = input.availableRecipes.find((r: RecipeForAI) => r.id === meal.recipeId);
                if (originalRecipe) {
                    meal.calculatedMacros = {
                        calories: originalRecipe.macrosPerServing.calories * 0.25,
                        protein: originalRecipe.macrosPerServing.protein * 0.25,
                        carbs: originalRecipe.macrosPerServing.carbs * 0.25,
                        fat: originalRecipe.macrosPerServing.fat * 0.25,
                    };
                }
                meal.servings = 0.25;
            }
            return meal;
        });

        return parsedOutput.data;
    }
);

export const suggestMealPlan = onCallGenkit(
    {},
    suggestMealPlanFlow
);

export type SuggestMealPlanInput = z.infer<typeof SuggestMealPlanInputSchema>;
export type SuggestMealPlanOutput = z.infer<typeof SuggestMealPlanOutputSchema>;
