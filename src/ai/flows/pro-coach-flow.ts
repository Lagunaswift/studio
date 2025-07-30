
'use server';
import { z } from 'zod';
import { ai } from '../genkit';  // Your configured Genkit instance
import { ProCoachInputSchema, ProCoachOutputSchema } from './schemas';
import { onCallGenkit } from 'firebase-functions/v2/https';

export const proCoachFlow = ai.defineFlow(
  {
    name: 'proCoachFlow',
    inputSchema: ProCoachInputSchema,
    outputSchema: ProCoachOutputSchema,
  },
  async (input: z.infer<typeof ProCoachInputSchema>) => {
    const { output } = await ai.prompt('proCoach').run(input);
    if (!output) {
      throw new Error('AI Preppy failed to generate a recommendation.');
    }
    return output;
  }
);
