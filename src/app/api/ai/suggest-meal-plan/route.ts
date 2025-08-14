// src/app/api/ai/suggest-meal-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { suggestMealPlanFlow, type SuggestMealPlanInput, type SuggestMealPlanOutput } from '@/ai/flows/suggest-meal-plan';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  console.log('🔥 AI Suggest Meal Plan API called');
  
  try {
    const body: SuggestMealPlanInput = await request.json();
    console.log('📨 Request body received:', {
      hasMacroTargets: !!body.macroTargets,
      mealStructureCount: body.mealStructure?.length || 0,
      availableRecipesCount: body.availableRecipes?.length || 0,
      dietaryPreferences: body.dietaryPreferences?.length || 0,
      allergens: body.allergens?.length || 0
    });

    // Made macroTargets optional to match schema
    if (!body.mealStructure || !Array.isArray(body.mealStructure) || body.mealStructure.length === 0) {
      console.error('❌ Invalid mealStructure:', body.mealStructure);
      return NextResponse.json(
        { error: 'Invalid input: mealStructure is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!body.availableRecipes || !Array.isArray(body.availableRecipes)) {
      console.error('❌ Invalid availableRecipes:', body.availableRecipes);
      return NextResponse.json(
        { error: 'Invalid input: availableRecipes is required and must be an array' },
        { status: 400 }
      );
    }

    if (body.availableRecipes.length === 0) {
      console.error('❌ No available recipes provided');
      return NextResponse.json(
        { error: 'Invalid input: availableRecipes must contain at least one recipe' },
        { status: 400 }
      );
    }

    console.log('🚀 Calling Genkit suggestMealPlanFlow...');
    const result: SuggestMealPlanOutput = await suggestMealPlanFlow(body);
    console.log('✅ Genkit flow completed successfully');
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('💥 AI Meal Plan Suggestion API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate meal plan suggestions',
        details: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        errorType: error.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}