
// src/lib/ai/AIRequestManager.ts

import { z } from 'zod';
import { suggestMealPlan } from '@/ai/flows/suggest-meal-plan';
import { suggestRecipes } from '@/ai/flows/suggest-recipes';
import { analyzeNutrition } from '@/ai/flows/analyze-nutrition';

interface AIRequest {
    prompt: string;
    context: any;
}

class AIRequestManager {
    private static instance: AIRequestManager;

    private constructor() {}

    public static getInstance(): AIRequestManager {
        if (!AIRequestManager.instance) {
            AIRequestManager.instance = new AIRequestManager();
        }
        return AIRequestManager.instance;
    }

    private async callAI(request: AIRequest): Promise<any> {
        try {
          // Handle meal plan requests
          if (request.prompt.includes('meal plan') || request.prompt.includes('Generate a healthy')) {
            const { suggestMealPlan } = await import('@/ai/flows/suggest-meal-plan');
            return suggestMealPlan(request.context);
          }
          
          // Handle recipe suggestion requests
          if (request.prompt.includes('recipe') || request.prompt.includes('Suggest') || request.prompt.includes('pantry')) {
            const { suggestRecipes } = await import('@/ai/flows/suggest-recipes');
            return suggestRecipes(request.context);
          }
          
          // Handle nutrition analysis requests
          if (request.prompt.includes('nutrition') || request.prompt.includes('calories') || request.prompt.includes('Analyze')) {
            const { analyzeNutrition } = await import('@/ai/flows/analyze-nutrition');
            return analyzeNutrition(request.context);
          }
          
          // Fallback for unrecognized requests
          console.warn('Unrecognized AI request type:', request.prompt);
          return {
            success: false,
            error: 'Request type not supported',
            fallback: 'Please try a different request or contact support.'
          };
          
        } catch (error) {
          console.error('AI implementation error:', error);
          throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async generateRecipeSuggestions(ingredients: string[], context: any): Promise<any> {
        const request: AIRequest = {
            prompt: `Suggest recipes based on the following ingredients: ${ingredients.join(', ')}`,
            context: {
                ingredients,
                ...context
            }
        };
        return this.callAI(request);
    }
    
    public async generateMealPlan(context: any): Promise<any> {
        const request: AIRequest = {
            prompt: 'Generate a healthy meal plan',
            context: context
        };
        return this.callAI(request);
    }

    public async analyzeNutrition(context: any): Promise<any> {
        const request: AIRequest = {
            prompt: 'Analyze nutrition for the provided meal plan',
            context: context
        };
        return this.callAI(request);
    }
}

export const optimizedAIService = AIRequestManager.getInstance();
