// src/lib/ai/OptimizedAIService.ts
import { z } from 'zod';

// 🔧 FIX: Import the class directly and create our own instance to avoid circular dependencies
import { AIRequestManager } from './AIRequestManager';

// Response schemas for type safety
const MealPlanSchema = z.object({
  meals: z.array(z.object({
    name: z.string(),
    type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    calories: z.number(),
    macros: z.object({
      protein: z.number(),
      carbs: z.number(),
      fat: z.number()
    }),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string())
  })),
  totalCalories: z.number(),
  totalMacros: z.object({
    protein: z.number(),
    carbs: z.number(),
    fat: z.number()
  })
});

const RecipeSuggestionSchema = z.object({
  recipes: z.array(z.object({
    name: z.string(),
    description: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    cookingTime: z.number(),
    servings: z.number(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
    nutrition: z.object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number()
    })
  }))
});

interface UserPreferences {
  dietType?: string;
  allergens?: string[];
  targetCalories?: number;
  targetMacros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  activityLevel?: string;
  goals?: string[];
}

class OptimizedAIService {
  // 🔧 FIX: Create our own instance to avoid circular dependency
  private aiRequestManager: AIRequestManager;

  constructor() {
    this.aiRequestManager = new AIRequestManager();
  }

  // Generate meal plan with aggressive caching
  async generateMealPlan(
    preferences: UserPreferences,
    duration: number = 7,
    options: {
      forceRefresh?: boolean;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ) {
    const { forceRefresh = false, priority = 'normal' } = options;

    // Create efficient prompt
    const prompt = this.createMealPlanPrompt(preferences, duration);
    const userHash = this.hashUserPreferences(preferences);
    
    try {
      const result = await this.aiRequestManager.generateWithCache({
        prompt,
        model: 'gemini-2.5-flash', // Use cheapest model for meal plans
        config: {
          maxOutputTokens: 2048,
          temperature: 0.8,
          responseFormat: { type: 'json_object' }
        },
        userId: userHash,
        context: forceRefresh ? { timestamp: Date.now() } : undefined
      }, {
        cacheType: 'meal-plan',
        priority
      });

      // Validate response
      const validated = MealPlanSchema.parse(result);
      return {
        success: true,
        data: validated,
        fromCache: !forceRefresh
      };

    } catch (error) {
      console.error('❌ Meal plan generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: this.getFallbackMealPlan(preferences)
      };
    }
  }

  // Generate recipe suggestions from pantry
  async generateRecipeSuggestions(
    pantryItems: string[],
    preferences: UserPreferences,
    options: {
      maxRecipes?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      maxCookingTime?: number;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ) {
    const { maxRecipes = 3, difficulty, maxCookingTime = 60, priority = 'normal' } = options;

    const prompt = this.createRecipeSuggestionPrompt(pantryItems, preferences, {
      maxRecipes,
      difficulty,
      maxCookingTime
    });

    try {
      const result = await this.aiRequestManager.generateWithCache({
        prompt,
        model: 'gemini-2.5-flash',
        config: {
          maxOutputTokens: 1536,
          temperature: 0.9,
          responseFormat: { type: 'json_object' }
        },
        userId: this.hashUserPreferences(preferences),
        context: { pantryItems: pantryItems.slice(0, 10) }
      }, {
        cacheType: 'recipe-suggestion',
        priority
      });

      const validated = RecipeSuggestionSchema.parse(result);
      return {
        success: true,
        data: validated
      };

    } catch (error) {
      console.error('❌ Recipe suggestion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: this.getFallbackRecipes(pantryItems)
      };
    }
  }

  // Analyze nutrition for foods
  async analyzeNutrition(
    foodItems: Array<{ name: string; quantity: string }>,
    detailed: boolean = false,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) {
    const prompt = this.createNutritionPrompt(foodItems, detailed);

    try {
      const result = await this.aiRequestManager.generateWithCache({
        prompt,
        model: 'gemini-2.5-flash',
        config: {
          maxOutputTokens: detailed ? 1024 : 512,
          temperature: 0.3,
          responseFormat: { type: 'json_object' }
        },
        context: { foods: foodItems.slice(0, 5) }
      }, {
        cacheType: 'nutrition-analysis',
        priority
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ Nutrition analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createMealPlanPrompt(preferences: UserPreferences, duration: number): string {
    return `Generate a ${duration}-day meal plan for:
Diet: ${preferences.dietType || 'balanced'}
Calories: ${preferences.targetCalories || 2000}/day
Activity: ${preferences.activityLevel || 'moderate'}
Goals: ${preferences.goals?.join(', ') || 'general health'}
${preferences.allergens?.length ? `Avoid: ${preferences.allergens.join(', ')}` : ''}

Return JSON with meals array containing: name, type, calories, macros {protein, carbs, fat}, ingredients, instructions.
Include totalCalories and totalMacros. Keep meals simple and practical.`;
  }

  private createRecipeSuggestionPrompt(
    pantryItems: string[],
    preferences: UserPreferences,
    options: {
      maxRecipes?: number;
      difficulty?: string;
      maxCookingTime?: number;
    }
  ): string {
    const items = pantryItems.slice(0, 15).join(', ');
    
    return `Suggest ${options.maxRecipes || 3} recipes using: ${items}
Diet: ${preferences.dietType || 'any'}
Difficulty: ${options.difficulty || 'any'}
Max time: ${options.maxCookingTime || 60} minutes
${preferences.allergens?.length ? `Avoid: ${preferences.allergens.join(', ')}` : ''}

Return JSON with recipes array: name, description, difficulty, cookingTime, servings, ingredients, instructions, nutrition.
Prioritize recipes that use the most available ingredients.`;
  }

  private createNutritionPrompt(
    foodItems: Array<{ name: string; quantity: string }>,
    detailed: boolean
  ): string {
    const foods = foodItems.slice(0, 10).map(item => `${item.quantity} ${item.name}`).join(', ');
    
    return detailed
      ? `Analyze nutrition for: ${foods}. Provide detailed breakdown including vitamins, minerals, calories, macros, and health insights.`
      : `Calculate total calories, protein, carbs, fat for: ${foods}. Brief analysis only.`;
  }

  private hashUserPreferences(preferences: UserPreferences): string {
    const key = JSON.stringify({
      diet: preferences.dietType,
      allergens: preferences.allergens?.sort(),
      calories: preferences.targetCalories,
      activity: preferences.activityLevel
    });
    
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  private getFallbackMealPlan(preferences: UserPreferences) {
    return {
      meals: [
        {
          name: 'Oatmeal with Berries',
          type: 'breakfast' as const,
          calories: 300,
          macros: { protein: 12, carbs: 45, fat: 8 },
          ingredients: ['oats', 'berries', 'milk'],
          instructions: ['Cook oats', 'Add berries', 'Serve hot']
        }
      ],
      totalCalories: 300,
      totalMacros: { protein: 12, carbs: 45, fat: 8 }
    };
  }

  private getFallbackRecipes(pantryItems: string[]) {
    return {
      recipes: [
        {
          name: 'Simple Pantry Meal',
          description: 'Basic meal from available ingredients',
          difficulty: 'easy' as const,
          cookingTime: 30,
          servings: 2,
          ingredients: pantryItems.slice(0, 5),
          instructions: ['Combine ingredients', 'Cook until done'],
          nutrition: { calories: 400, protein: 20, carbs: 40, fat: 15 }
        }
      ]
    };
  }

  // Get AI usage statistics
  getUsageStats() {
    return this.aiRequestManager.getStats();
  }

  // Clear all AI caches
  clearCache() {
    this.aiRequestManager.clearCache();
  }
}

export const optimizedAIService = new OptimizedAIService();