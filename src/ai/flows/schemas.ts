//src/ai/flows/schemas.ts
/**
 * @fileOverview Shared Zod schemas for AI flows.
 * This file does NOT use the 'use server' directive, so it can be safely
 * imported by multiple flows to share type definitions.
 */

import { z } from 'zod';
import { MEAL_TYPES } from '@/lib/data';
import type { MealType } from '@/types';

// Reusable schema for macronutrient data
export const MacroDataSchema = z.object({
  calories: z.number().finite().nonnegative().describe("Total calories"),
  protein: z.number().finite().nonnegative().describe("Total protein in grams"),
  carbs: z.number().finite().nonnegative().describe("Total carbohydrates in grams"),
  fat: z.number().finite().nonnegative().describe("Total fat in grams"),
});

// Schema for Bug Reporting Flow
export const BugReportInputSchema = z.object({
  description: z.string().min(20, "Please provide a detailed description of the bug.").describe("The user's detailed description of the issue they encountered."),
  appVersion: z.string().optional().describe("The version of the app the user is on."),
  userId: z.string().optional().describe("The user's ID for tracking purposes."),
});

export const BugReportOutputSchema = z.object({
  title: z.string().describe("A short, descriptive title for the bug report (e.g., 'Recipe fails to save', 'Macro chart not updating')."),
  summary: z.string().describe("A concise one-paragraph summary of the user's issue."),
  category: z.enum(['UI/UX', 'Performance', 'Data', 'Authentication', 'AI/Preppy', 'Other']).describe("The best-fitting category for the reported bug."),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).describe("The estimated priority based on the bug's impact (e.g., 'Critical' for crashes, 'Low' for typos)."),
  stepsToReproduce: z.array(z.string()).optional().describe("A list of steps to reproduce the bug, if discernible from the user's description."),
});

// Schema for App Guide Flow
export const AppGuideInputSchema = z.object({
  question: z.string().describe('The users question about how to use the app.'),
});

export const AppGuideOutputSchema = z.object({
  answer: z.string().describe('A helpful answer based on the provided app guide context.'),
});

// Schema for Pro Coach Flow
export const ProCoachInputSchema = z.object({
  primaryGoal: z.enum(['fatLoss', 'muscleGain', 'maintenance', 'notSpecified']).describe("User's primary goal."),
  targetWeightChangeRateKg: z.number().describe("User's desired weekly weight change rate in kg (e.g., -0.5 for loss, 0.25 for gain)."),
  dynamicTdee: z.number().positive().describe("User's newly calculated dynamic TDEE (Total Daily Energy Expenditure)."),
  actualAvgCalories: z.number().positive().describe("User's actual average daily calorie intake over the analysis period."),
  actualWeeklyWeightChangeKg: z.number().describe("User's actual average weekly weight change in kg, based on their trend weight."),
  currentProteinTarget: z.number().nonnegative().describe("User's current daily protein target in grams."),
  currentFatTarget: z.number().nonnegative().describe("User's current daily fat target in grams."),
});

export const ProCoachOutputSchema = z.object({
  newMacroTargets: MacroDataSchema.describe("The new recommended daily macro targets for the user."),
  coachingSummary: z.string().describe("A concise, encouraging, and adherence-neutral summary of the week's progress and the recommended changes."),
});

// Schemas for Suggest Meal Plan Flow
const RecipeSchemaForAI = z.object({
    id: z.number().describe("Unique ID of the recipe"),
    name: z.string().describe("Name of the recipe"),
    macrosPerServing: MacroDataSchema.describe("Macronutrients per single serving of this recipe"),
    tags: z.array(z.string()).optional().describe("Tags associated with the recipe, e.g., 'vegetarian', 'gluten-free', 'quick'"),
});

const MacroTargetsSchemaForAI = MacroDataSchema.extend({}).describe("User's daily macronutrient targets. Aim to meet these.");

const MealSlotSchemaForAI = z.object({
    id: z.string().describe("Unique ID of the meal slot"),
    name: z.string().describe("User-defined name for the meal slot (e.g., 'Breakfast', 'Mid-morning Snack')"),
    type: z.enum(MEAL_TYPES as [MealType, ...MealType[]]).describe("The general category of the meal (e.g., 'Breakfast', 'Lunch')"),
});

export const SuggestMealPlanInputSchema = z.object({
    macroTargets: MacroTargetsSchemaForAI.optional().nullable().describe("User's daily macronutrient targets. Aim to meet these. Can be null if not set."),
    dietaryPreferences: z.array(z.string()).optional().describe("List of dietary preferences (e.g., 'Vegetarian', 'Vegan'). Adhere to these strictly."),
    allergens: z.array(z.string()).optional().describe("List of allergens to avoid (e.g., 'Nuts', 'Dairy'). Exclude recipes containing these."),
    mealStructure: z.array(MealSlotSchemaForAI).describe("The user's desired meal structure for the day. Plan one recipe for each slot."),
    availableRecipes: z.array(RecipeSchemaForAI).describe("List of available recipes to choose from."),
    currentDate: z.string().optional().describe("The date for which the meal plan is being generated (YYYY-MM-DD). For context if needed."),
});

const PlannedRecipeItemSchema = z.object({
    mealSlotId: z.string().describe("The ID of the meal slot this recipe is planned for."),
    mealSlotName: z.string().describe("The name of the meal slot (e.g., 'Breakfast')."),
    recipeId: z.number().describe("The ID of the chosen recipe."),
    recipeName: z.string().describe("The name of the chosen recipe."),
    servings: z.number().finite().describe("Number of servings of the recipe to plan for this meal slot (e.g., 1, 1.5, 0.5). Must be a positive number, at least 0.25, based on prompt guidance."),
    calculatedMacros: MacroDataSchema.describe("Calculated macros for the chosen recipe and servings for this specific meal."),
});

export const SuggestMealPlanOutputSchema = z.object({
    plannedMeals: z.array(PlannedRecipeItemSchema).describe("An array of recipes planned for each meal slot."),
    totalAchievedMacros: MacroDataSchema.describe("The total aggregated macronutrients for the entire suggested meal plan."),
    aiJustification: z.string().describe("A brief justification from the AI explaining its choices and how it tried to meet the targets and preferences."),
    fitnessAssessment: z.string().describe("A brief assessment of how well the plan meets the targets (e.g., 'Calories are slightly over, protein target met.'). Consider macro percentages too."),
});

// Schemas for Suggest Recipe Modification Flow
const RecipeToModifySchema = z.object({
    name: z.string().describe("The original name of the recipe."),
    ingredients: z.array(z.string()).describe("The original list of ingredients."),
    instructions: z.array(z.string()).describe("The original list of instructions."),
    description: z.string().optional().describe("The original description of the recipe."),
    tags: z.array(z.string()).optional().describe("The original tags of the recipe."),
});

export const SuggestRecipeModificationInputSchema = z.object({
    recipeToModify: RecipeToModifySchema,
    userRequest: z.string().describe("The user's request for modification (e.g., 'make it vegetarian', 'replace chicken with tofu', 'what can I use instead of almonds?')."),
});

export const SuggestRecipeModificationOutputSchema = z.object({
    newName: z.string().describe("A new, fitting name for the modified recipe. For example, if the original was 'Chicken Stir-Fry' and the request was 'make it vegetarian', a good new name would be 'Tofu Stir-Fry'."),
    newDescription: z.string().describe("A brief, updated description for the modified recipe."),
    newIngredients: z.array(z.string()).describe("The new, complete list of ingredients for the modified recipe."),
    newInstructions: z.array(z.string()).describe("The new, complete list of step-by-step instructions for the modified recipe."),
    aiJustification: z.string().describe("A concise explanation of the changes made and why. For example: 'I replaced the chicken with firm tofu and adjusted the marinade to better suit it. I also added a note to press the tofu first for best results.' Important: State that macronutrient data has NOT been recalculated and is copied from the original recipe, so it must be reviewed by the user."),
});

// Schemas for Suggest Recipes By Ingredients Flow
export const RecipeWithIngredientsSchema = z.object({
    id: z.number().describe("Unique ID of the recipe"),
    name: z.string().describe("Name of the recipe"),
    ingredients: z.array(z.string()).describe("The full list of ingredients for this recipe. Example: ['1 cup flour', '2 large eggs', '100g sugar']"),
    tags: z.array(z.string()).optional().describe("Tags associated with the recipe, e.g., 'vegetarian', 'gluten-free', 'quick'"),
    macrosPerServing: MacroDataSchema.optional().describe("Macronutrients per single serving of this recipe. Useful for context if available."),
});

export const SuggestRecipesByIngredientsInputSchema = z.object({
    userIngredients: z.array(z.string()).min(1).describe("List of ingredients the user has on hand (e.g., ['chicken breast', 'broccoli', 'onion', 'soy sauce'])."),
    availableRecipes: z.array(RecipeWithIngredientsSchema).min(1).describe("List of available recipes for the AI to consider, including their full ingredient lists."),
    dietaryPreferences: z.array(z.string()).optional().describe("User's dietary preferences (e.g., 'Vegetarian', 'Vegan'). AI should strictly adhere to these."),
    allergens: z.array(z.string()).optional().describe("Allergens to avoid (e.g., 'Nuts', 'Dairy'). AI should strictly exclude recipes containing these."),
    maxResults: z.number().optional().default(3).describe("Maximum number of recipe suggestions to return (e.g., 3 to 5)."),
});

const SuggestedRecipeItemSchema = z.object({
    recipeId: z.number().describe("The ID of the suggested recipe."),
    recipeName: z.string().describe("The name of the suggested recipe."),
    utilizationScore: z.number().min(0).max(1).describe("A score from 0 to 1 indicating how well the user's ingredients are utilized by this recipe. 1 means high utilization. Consider both the number of user's ingredients used and their proportion in the recipe."),
    matchedIngredients: z.array(z.string()).describe("List of ingredients from the user's input that are present in this recipe."),
    missingKeyIngredients: z.array(z.string()).optional().describe("Up to 3-4 key ingredients required for this recipe that the user does not have. Focus on essential items."),
    notes: z.string().optional().describe("Brief notes or justification why this recipe is a good suggestion (e.g., 'Great way to use up your chicken and broccoli', 'Only missing one common pantry item')."),
});

export const SuggestRecipesByIngredientsOutputSchema = z.object({
    suggestedRecipes: z.array(SuggestedRecipeItemSchema).describe("An array of recipe suggestions based on the user's ingredients."),
    aiGeneralNotes: z.string().optional().describe("Overall comments, cooking tips, or general suggestions for ingredient substitutions from the AI. This could include ideas for how to adapt recipes if some ingredients are missing."),
});
