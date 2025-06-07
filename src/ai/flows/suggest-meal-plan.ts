'use server';

/**
 * @fileOverview A meal plan suggestion AI agent.
 *
 * - suggestMealPlan - A function that suggests a meal plan.
 * - SuggestMealPlanInput - The input type for the suggestMealPlan function.
 * - SuggestMealPlanOutput - The return type for the suggestMealPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMealPlanInputSchema = z.object({
  dietaryGoals: z
    .string()
    .describe(
      'The dietary goals of the user, such as weight loss, muscle gain, or general health.'
    ),
  preferences: z
    .string()
    .describe('The food preferences of the user, including any allergies or dislikes.'),
});
export type SuggestMealPlanInput = z.infer<typeof SuggestMealPlanInputSchema>;

const SuggestMealPlanOutputSchema = z.object({
  mealPlan: z.string().describe('A suggested meal plan for the day.'),
});
export type SuggestMealPlanOutput = z.infer<typeof SuggestMealPlanOutputSchema>;

export async function suggestMealPlan(input: SuggestMealPlanInput): Promise<SuggestMealPlanOutput> {
  return suggestMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMealPlanPrompt',
  input: {schema: SuggestMealPlanInputSchema},
  output: {schema: SuggestMealPlanOutputSchema},
  prompt: `You are a personal meal planner.

You will use the provided dietary goals and preferences to create a meal plan for the user.

Dietary Goals: {{{dietaryGoals}}}
Preferences: {{{preferences}}}

Meal Plan:`,
});

const suggestMealPlanFlow = ai.defineFlow(
  {
    name: 'suggestMealPlanFlow',
    inputSchema: SuggestMealPlanInputSchema,
    outputSchema: SuggestMealPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
