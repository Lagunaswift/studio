
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

// Reusable schema for micronutrient data
export const MicronutrientsSchema = z.object({
  iron: z.number().nullable().describe('Estimated iron in milligrams (mg).'),
  calcium: z.number().nullable().describe('Estimated calcium in milligrams (mg).'),
  potassium: z.number().nullable().describe('Estimated potassium in milligrams (mg).'),
  vitaminA: z.number().nullable().describe('Estimated Vitamin A in micrograms (mcg).'),
  vitaminC: z.number().nullable().describe('Estimated Vitamin C in milligrams (mg).'),
  vitaminD: z.number().nullable().describe('Estimated Vitamin D in micrograms (mcg).'),
});
