
'use server';
/**
 * @fileOverview The Preppy AI agent that analyzes user progress and provides new macro targets.
 *
 * - runPreppy - A function that handles the coaching analysis.
 * - PreppyInput - The input type for the runPreppy function.
 * - PreppyOutput - The return type for the runPreppy function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MacroDataSchema } from './schemas';

// Input schema for the Preppy flow
const PreppyInputSchema = z.object({
  primaryGoal: z.enum(['fatLoss', 'muscleGain', 'maintenance', 'notSpecified']).describe("User's primary goal."),
  targetWeightChangeRateKg: z.number().describe("User's desired weekly weight change rate in kg (e.g., -0.5 for loss, 0.25 for gain)."),
  dynamicTdee: z.number().positive().describe("User's newly calculated dynamic TDEE (Total Daily Energy Expenditure)."),
  actualAvgCalories: z.number().positive().describe("User's actual average daily calorie intake over the analysis period."),
  actualWeeklyWeightChangeKg: z.number().describe("User's actual average weekly weight change in kg, based on their trend weight."),
  currentProteinTarget: z.number().nonnegative().describe("User's current daily protein target in grams."),
  currentFatTarget: z.number().nonnegative().describe("User's current daily fat target in grams."),
});
export type PreppyInput = z.infer<typeof PreppyInputSchema>;

// Output schema for the Preppy flow
const PreppyOutputSchema = z.object({
  newMacroTargets: MacroDataSchema.describe("The new recommended daily macro targets for the user."),
  coachingSummary: z.string().describe("A concise, encouraging, and adherence-neutral summary of the week's progress and the recommended changes."),
});
export type PreppyOutput = z.infer<typeof PreppyOutputSchema>;


export async function runPreppy(input: PreppyInput): Promise<PreppyOutput> {
  return preppyFlow(input);
}


const preppyPrompt = ai.definePrompt({
    name: 'preppyPrompt',
    input: {schema: PreppyInputSchema},
    output: {schema: PreppyOutputSchema},
    prompt: `You are "Preppy," a supportive, data-driven, and adherence-neutral nutrition coach. Your goal is to help the user make steady progress toward their goal without shaming them for any deviations from previous targets. Your tone is encouraging and focuses on the data.

**User's Data & Goals:**
- Primary Goal: {{{primaryGoal}}}
- Desired Weekly Weight Change: {{{targetWeightChangeRateKg}}} kg
- Newly Calculated TDEE (from their progress): {{{dynamicTdee}}} kcal
- Actual Average Daily Calorie Intake: {{{actualAvgCalories}}} kcal
- Actual Weekly Weight Change (from trend): {{{actualWeeklyWeightChangeKg}}} kg
- Current Protein Target: {{{currentProteinTarget}}}g
- Current Fat Target: {{{currentFatTarget}}}g

**Your Task (Follow these steps EXACTLY):**

1.  **Calculate New Calorie Target:**
    *   The energy equivalent of 1 kg of body weight is approximately 7700 kcal.
    *   Calculate the required daily calorie adjustment: \`dailyAdjustment = (targetWeightChangeRateKg * 7700) / 7\`.
    *   Calculate the new calorie target: \`newCalorieTarget = dynamicTdee + dailyAdjustment\`. Round this to the nearest whole number.

2.  **Calculate New Macro Targets:**
    *   Use the \`newCalorieTarget\` you just calculated.
    *   **Protein:** Keep the protein the same as the user's \`currentProteinTarget\`.
    *   **Fat:** Keep the fat the same as the user's \`currentFatTarget\`.
    *   **Carbohydrates:** Calculate the remaining calories for carbs: \`carbCalories = newCalorieTarget - (currentProteinTarget * 4) - (currentFatTarget * 9)\`.
    *   Convert carb calories to grams: \`carbGrams = carbCalories / 4\`. If this is negative, set it to 0. Round to the nearest whole number.
    *   Populate the \`newMacroTargets\` field in the output with these calculated values (calories, protein, carbs, fat).

3.  **Generate a Coaching Summary (2-4 sentences):**
    *   **Adherence-Neutral Philosophy**: NEVER use negative or shaming language like "you went over," "you didn't eat enough," or "you failed." Focus purely on the data and the forward plan.
    *   **Acknowledge Progress**: Start by stating the user's actual results based on the data. Use this template: "Looking at your progress over the last couple of weeks, your weight trend changed by about **{{actualWeeklyWeightChangeKg.toFixed(2)}} kg/week** on an average intake of **{{actualAvgCalories.toFixed(0)}} kcal/day**."
    *   **Explain the Adjustment**: State the action taken based on their updated TDEE. Use this template: "Based on this, your updated TDEE is now estimated at **{{{dynamicTdee}}} kcal**. To keep you on track for your goal, I've adjusted your targets for the week ahead."
    *   **Be Encouraging**: End with a short, positive, forward-looking statement like "Let's have a great week!" or "Keep up the consistent effort!".

**Example Output Structure (Reminder):**
{
  "newMacroTargets": { "calories": ..., "protein": ..., "carbs": ..., "fat": ... },
  "coachingSummary": "..."
}

Output the entire response as a single, valid JSON object that conforms EXACTLY to the \`PreppyOutputSchema\`. Do not include any text outside this JSON object.
`
});


const preppyFlow = ai.defineFlow(
  {
    name: 'preppyFlow',
    inputSchema: PreppyInputSchema,
    outputSchema: PreppyOutputSchema,
  },
  async (input) => {
    // Basic validation
    if (!input.dynamicTdee || input.dynamicTdee <= 0) {
      throw new Error("A valid Dynamic TDEE is required for the Preppy analysis.");
    }
    
    const {output} = await preppyPrompt(input);

    if (!output) {
        throw new Error("AI Preppy failed to generate a recommendation.");
    }
    
    return output;
  }
);
