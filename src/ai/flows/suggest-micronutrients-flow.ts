
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MicronutrientEstimationInputSchema, MicronutrientsSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';

export const micronutrientEstimationFlow = ai.defineFlow(
  {
    name: 'micronutrientEstimationFlow',
    inputSchema: MicronutrientEstimationInputSchema,
    outputSchema: MicronutrientsSchema,
  },
  async (input: z.infer<typeof MicronutrientEstimationInputSchema>) => {
    if (!input.ingredients || input.ingredients.length === 0) {
      throw new Error("Ingredient list cannot be empty.");
    }
    const suggestMicronutrientsPrompt = ai.prompt('suggestMicronutrients');
    const response = await suggestMicronutrientsPrompt(input);
    const output = response.output;
    if (!output) {
      throw new Error('AI failed to generate a micronutrient estimation.');
    }
    return output;
  }
);

export const suggestMicronutrients = onCallGenkit(
  {},
  micronutrientEstimationFlow
);
