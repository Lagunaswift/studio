// src/app/api/ai/suggest-meal-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { suggestMealPlanFlow, type SuggestMealPlanInput, type SuggestMealPlanOutput } from '@/ai/flows/suggest-meal-plan';

export async function POST(request: NextRequest) {
  try {
    const body: SuggestMealPlanInput = await request.json();

    if (!body.macroTargets) {
      return NextResponse.json(
        { error: 'Invalid input: macroTargets is required' },
        { status: 400 }
      );
    }

    if (!body.mealStructure || !Array.isArray(body.mealStructure) || body.mealStructure.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: mealStructure is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!body.availableRecipes || !Array.isArray(body.availableRecipes)) {
      return NextResponse.json(
        { error: 'Invalid input: availableRecipes is required and must be an array' },
        { status: 400 }
      );
    }

    const result: SuggestMealPlanOutput = await suggestMealPlanFlow(body);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('AI Meal Plan Suggestion API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate meal plan suggestions',
        details: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}