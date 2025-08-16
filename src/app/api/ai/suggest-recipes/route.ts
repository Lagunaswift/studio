// src/app/api/ai/suggest-recipes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { suggestRecipesByIngredients, type SuggestRecipesByIngredientsInput, type SuggestRecipesByIngredientsOutput } from '@/ai/flows/suggest-recipes-by-ingredients-flow';
import { trackAPIUsage } from '@/lib/api-monitoring';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const userId = request.headers.get('x-user-id');
  
  try {
    const body: SuggestRecipesByIngredientsInput = await request.json();

    if (!body.userIngredients || !Array.isArray(body.userIngredients) || body.userIngredients.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: userIngredients is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!body.availableRecipes || !Array.isArray(body.availableRecipes)) {
      return NextResponse.json(
        { error: 'Invalid input: availableRecipes is required and must be an array' },
        { status: 400 }
      );
    }

    const result: SuggestRecipesByIngredientsOutput = await suggestRecipesByIngredients(body);
    
    // Track successful API usage
    await trackAPIUsage('/api/ai/suggest-recipes', userId, Date.now() - startTime, 200);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('AI Recipe Suggestion API Error:', error);
    
    // Track failed API usage
    await trackAPIUsage('/api/ai/suggest-recipes', userId, Date.now() - startTime, 500);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recipe suggestions',
        details: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}