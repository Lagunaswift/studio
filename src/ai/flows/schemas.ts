
/**
 * @fileOverview Shared Zod schemas for AI flows.
 * This file does NOT use the 'use server' directive, so it can be safely
 * imported by multiple flows to share type definitions.
 */

import {z} from 'genkit';

// Reusable schema for macronutrient data
export const MacroDataSchema = z.object({
  calories: z.number().finite().nonnegative().describe("Total calories"),
  protein: z.number().finite().nonnegative().describe("Total protein in grams"),
  carbs: z.number().finite().nonnegative().describe("Total carbohydrates in grams"),
  fat: z.number().finite().nonnegative().describe("Total fat in grams"),
});
