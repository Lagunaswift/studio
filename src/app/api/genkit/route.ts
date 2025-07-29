
// src/app/api/genkit/route.ts
import { genkit, ai } from '@/ai/genkit';
import { appGuideFlow } from '@/ai/flows/app-guide-flow';
import { preppyFlow } from '@/ai/flows/pro-coach-flow';
import { reportBugFlow } from '@/ai/flows/report-bug-flow';
import { micronutrientEstimationFlow } from '@/ai/flows/suggest-micronutrients-flow';
import { suggestProteinIntakeFlow } from '@/ai/flows/suggest-protein-intake-flow';
import { suggestRecipeModificationFlow } from '@/ai/flows/suggest-recipe-modification-flow';
import { suggestRecipesByIngredientsFlow } from '@/ai/flows/suggest-recipes-by-ingredients-flow';
import { suggestMealPlanFlow } from '@/ai/flows/suggest-meal-plan';
import { noauth } from 'genkit/auth';
import { z } from 'zod';

// Re-export all the flows that need to be exposed via the API
const allFlows = [
  appGuideFlow,
  preppyFlow,
  reportBugFlow,
  micronutrientEstimationFlow,
  suggestProteinIntakeFlow,
  suggestRecipeModificationFlow,
  suggestRecipesByIngredientsFlow,
  suggestMealPlanFlow,
  // You can add any other flows here
];

// This is a simple example flow to ensure the API route works.
// It does not require any authentication.
const helloFlow = ai.defineFlow(
  {
    name: 'helloFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
    authPolicy: noauth, // Explicitly state no authentication is required
  },
  async (name) => {
    return `Hello, ${name || 'World'}!`;
  }
);

export const POST = genkit.api({
  flows: [
      ...allFlows,
      helloFlow, // Include the simple test flow
  ]
});
