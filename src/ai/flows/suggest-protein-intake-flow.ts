
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SuggestProteinIntakeInputSchema, SuggestProteinIntakeOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';

export const suggestProteinIntakeFlow = ai.defineFlow(
  {
    name: 'suggestProteinIntakeFlow',
    inputSchema: SuggestProteinIntakeInputSchema,
    outputSchema: SuggestProteinIntakeOutputSchema,
  },
  async (input: z.infer<typeof SuggestProteinIntakeInputSchema>) => {
    
    const suggestProteinIntakePrompt = await ai.prompt('suggestProteinIntake').run({
      leanBodyMassKg: input.leanBodyMassKg,
      sex: input.sex,
      recommendationType: input.recommendationType,
      unitPreference: input.unitPreference,
      athleteType: input.athleteType,
      primaryGoal: input.primaryGoal,
      bodyFatPercentage: input.bodyFatPercentage,
    });
    const output = suggestProteinIntakePrompt.output();
    if (!output) {
      throw new Error('AI failed to generate a protein intake suggestion.');
    }
    return output;
  }
);

export const suggestProteinIntake = onCallGenkit(
  {},
  suggestProteinIntakeFlow
);
