/**
 * @fileOverview Shared Zod schemas for AI flows.
 * This file does NOT use the 'use server' directive, so it can be safely
 * imported by multiple flows to share type definitions.
 */
import { z } from 'genkit';
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
