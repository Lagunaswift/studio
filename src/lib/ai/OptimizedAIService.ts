import { aiRequestManager } from './AIRequestManager';
import { z } from 'zod';

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
      const result = await aiRequestManager.generateWithCache({
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
    } = {}
  ) {
    const { maxRecipes = 5, difficulty, maxCookingTime } = options;

    const prompt = this.createRecipeSuggestionPrompt(
      pantryItems,
      preferences,
      maxRecipes,
      difficulty,
      maxCookingTime
    );

    try {
      const result = await aiRequestManager.generateWithCache({
        prompt,
        model: 'gemini-2.5-flash',
        config: {
          maxOutputTokens: 1536,
          temperature: 0.9
        },
        context: { pantryItems: pantryItems.slice(0, 20) } // Limit context size
      }, {
        cacheType: 'recipe-suggestion',
        priority: 'normal'
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

  // Analyze nutrition with caching
  async analyzeNutrition(
    foodItems: Array<{ name: string; quantity: string }>,
    options: { detailed?: boolean } = {}
  ) {
    const { detailed = false } = options;

    const prompt = this.createNutritionPrompt(foodItems, detailed);

    try {
      const result = await aiRequestManager.generateWithCache({
        prompt,
        model: 'gemini-2.5-flash', // Simple analysis
        config: {
          maxOutputTokens: detailed ? 1024 : 512,
          temperature: 0.3 // Lower temperature for factual data
        }
      }, {
        cacheType: 'nutrition-analysis',
        priority: 'normal'
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Batch process multiple AI requests
  async batchProcess(
    requests: Array<{
      type: 'meal-plan' | 'recipe-suggestions' | 'nutrition';
      data: any;
      id: string;
    }>
  ) {
    console.log(`🔄 Processing ${requests.length} AI requests in batch...`);

    const promises = requests.map(async (request) => {
      try {
        let result;
        switch (request.type) {
          case 'meal-plan':
            result = await this.generateMealPlan(request.data, 7, { priority: 'low' });
            break;
          case 'recipe-suggestions':
            result = await this.generateRecipeSuggestions(
              request.data.pantryItems,
              request.data.preferences
            );
            break;
          case 'nutrition':
            result = await this.analyzeNutrition(request.data.foodItems);
            break;
          default:
            throw new Error(`Unknown request type: ${request.type}`);
        }

        return {
          id: request.id,
          success: true,
          data: result
        };
      } catch (error) {
        return {
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    console.log(`✅ Batch processing completed: ${results.length} requests`);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : { success: false, error: 'Request failed' }
    );
  }

  // Private helper methods
  private createMealPlanPrompt(preferences: UserPreferences, duration: number): string {
    const constraints = [];
    
    if (preferences.dietType) constraints.push(`Diet: ${preferences.dietType}`);
    if (preferences.allergens?.length) constraints.push(`Avoid: ${preferences.allergens.join(', ')}`);
    if (preferences.targetCalories) constraints.push(`Target: ${preferences.targetCalories} calories/day`);
    
    return `Generate a ${duration}-day meal plan.
Constraints: ${constraints.join(' | ')}
Format: JSON with meals array, each with name, type, calories, macros, ingredients, instructions.
Keep recipes simple, practical, and nutritionally balanced.`;
  }

  private createRecipeSuggestionPrompt(
    pantryItems: string[],
    preferences: UserPreferences,
    maxRecipes: number,
    difficulty?: string,
    maxCookingTime?: number
  ): string {
    const available = pantryItems.slice(0, 15).join(', '); // Limit to 15 items
    
    let constraints = `Available ingredients: ${available}`;
    if (difficulty) constraints += ` | Difficulty: ${difficulty}`;
    if (maxCookingTime) constraints += ` | Max cooking time: ${maxCookingTime} minutes`;
    if (preferences.dietType) constraints += ` | Diet: ${preferences.dietType}`;
    
    return `Create ${maxRecipes} recipes using available ingredients.
${constraints}
Format: JSON with recipes array, each with name, description, difficulty, cookingTime, servings, ingredients, instructions, nutrition.
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
    return aiRequestManager.getStats();
  }

  // Clear all AI caches
  clearCache() {
    aiRequestManager.clearCache();
  }
}

export const optimizedAIService = new OptimizedAIService();
