// src/app/api/genkit/route.ts
import { defineFlow, runFlow } from 'genkit/flow';
import { appGuideFlow } from '@/ai/flows/app-guide-flow';
import { preppyFlow } from '@/ai/flows/pro-coach-flow';
import { reportBugFlow } from '@/ai/flows/report-bug-flow';
import { micronutrientEstimationFlow } from '@/ai/flows/suggest-micronutrients-flow';
import { suggestProteinIntakeFlow } from '@/ai/flows/suggest-protein-intake-flow';
import { suggestRecipeModificationFlow } from '@/ai/flows/suggest-recipe-modification-flow';
import { suggestRecipesByIngredientsFlow } from '@/ai/flows/suggest-recipes-by-ingredients-flow';
import { suggestMealPlanFlow } from '@/ai/flows/suggest-meal-plan';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const allFlows = {
  appGuide: appGuideFlow,
  preppy: preppyFlow,
  reportBug: reportBugFlow,
  micronutrientEstimation: micronutrientEstimationFlow,
  suggestProteinIntake: suggestProteinIntakeFlow,
  suggestRecipeModification: suggestRecipeModificationFlow,
  suggestRecipesByIngredients: suggestRecipesByIngredientsFlow,
  suggestMealPlan: suggestMealPlanFlow,
};

type FlowName = keyof typeof allFlows;

export async function POST(req: NextRequest) {
  const { flowName, input } = await req.json();

  if (!flowName || typeof flowName !== 'string' || !allFlows[flowName as FlowName]) {
    return NextResponse.json({ error: 'Invalid flow name provided.' }, { status: 400 });
  }

  try {
    const selectedFlow = allFlows[flowName as FlowName];
    const result = await runFlow(selectedFlow, input);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Error running flow "${flowName}":`, error);
    return NextResponse.json({ error: 'An error occurred while running the flow.' }, { status: 500 });
  }
}
