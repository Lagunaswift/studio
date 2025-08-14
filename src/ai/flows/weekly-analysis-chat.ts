//src/ai/flows/weekly-analysis-chat.ts
'use server';

import { z } from 'zod';
import { ai } from '../genkit';

// Schema for weekly analysis chat input
export const WeeklyAnalysisChatInputSchema = z.object({
  userQuestion: z.string().describe("The user's question about their weekly analysis results"),
  coachingSummary: z.string().describe("The coaching summary from the weekly analysis"),
  newMacroTargets: z.object({
    calories: z.number().describe("New daily calorie target"),
    protein: z.number().describe("New daily protein target in grams"),
    carbs: z.number().describe("New daily carbohydrates target in grams"),
    fat: z.number().describe("New daily fat target in grams"),
  }).describe("The new recommended macro targets"),
  weeklyData: z.object({
    avgCaloriesConsumed: z.number().optional().describe("Average daily calories consumed this week"),
    weightTrend: z.number().optional().describe("Weight change trend in kg"),
    energyLevel: z.string().optional().describe("Overall energy level this week (high/medium/low)"),
    sleepQuality: z.number().optional().describe("Average sleep quality rating (1-10)"),
  }).optional().describe("Additional context from the user's weekly data"),
});

// Schema for weekly analysis chat output
export const WeeklyAnalysisChatOutputSchema = z.object({
  response: z.string().describe("A personalized, encouraging coaching response that addresses the user's question with specific reference to their data and targets. Should be conversational and supportive."),
  followUpSuggestion: z.string().optional().describe("An optional follow-up question or suggestion to keep the conversation helpful"),
});

export const weeklyAnalysisChatFlow = ai.defineFlow(
  {
    name: 'weeklyAnalysisChatFlow',
    inputSchema: WeeklyAnalysisChatInputSchema,
    outputSchema: WeeklyAnalysisChatOutputSchema,
  },
  async (input: z.infer<typeof WeeklyAnalysisChatInputSchema>) => {
    // Get the weekly analysis chat prompt
    const weeklyAnalysisChatPrompt = ai.prompt('weeklyAnalysisChat');
    
    // Invoke the prompt with the user's question and analysis context
    const response = await weeklyAnalysisChatPrompt({
      userQuestion: input.userQuestion,
      coachingSummary: input.coachingSummary,
      newTargets: input.newMacroTargets,
      weeklyData: input.weeklyData || {},
      currentDate: new Date().toISOString().split('T')[0],
    });

    const output = response.output;
    if (!output) {
      throw new Error('AI failed to generate a coaching response.');
    }

    const parsedOutput = WeeklyAnalysisChatOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
      throw new Error('Invalid output format from AI: ' + JSON.stringify(parsedOutput.error.flatten()));
    }

    return parsedOutput.data;
  }
);

export const runWeeklyAnalysisChatFlow = async (
  input: z.infer<typeof WeeklyAnalysisChatInputSchema>
) => {
  return await weeklyAnalysisChatFlow.run(input);
};