'use server';
/**
 * @fileOverview An AI agent that suggests protein intake for athletes based on modern, LBM-centric guidelines.
 *
 * - suggestProteinIntake - A function that suggests protein intake.
 * - SuggestProteinIntakeInput - The input type for the suggestProteinIntake function.
 * - SuggestProteinIntakeOutput - The return type for the suggestProteinIntake function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AthleteType, PrimaryGoal, Sex } from '@/types'; // Assuming types are correctly defined

const KG_TO_LB = 2.20462;
const LB_TO_KG = 1 / KG_TO_LB;

const SuggestProteinIntakeInputSchema = z.object({
  leanBodyMassKg: z.number().finite().positive().describe("User's lean body mass in kilograms (kg). This is required."),
  sex: z.enum(['male', 'female', 'notSpecified']).optional().default('notSpecified')
    .describe("User's sex, used to select appropriate targets when not using LBM."),
  recommendationType: z.enum(['average', 'safe', 'flexible']).default('average')
    .describe("The type of recommendation desired: 'average' for a standard target, 'safe' for a 'better safe than sorry' higher target, or 'flexible' for a lower intake."),
  unitPreference: z.enum(['g/kgLBM', 'g/lbLBM']).default('g/kgLBM')
    .describe("Preferred unit for displaying protein factors: grams per kg LBM or grams per lb LBM."),
  // --- Fields below are for contextual justification only ---
  athleteType: z.enum(['endurance', 'strengthPower', 'generalFitness', 'notSpecified']).optional().default('notSpecified')
    .describe("Type of athlete (e.g., endurance, strength/power). Used for context in the justification text only."),
  primaryGoal: z.enum(['fatLoss', 'muscleGain', 'maintenance', 'notSpecified']).optional().default('notSpecified')
    .describe("Primary training goal (e.g., fat loss, muscle gain). Used for context in the justification text only."),
  bodyFatPercentage: z.number().finite().positive().optional().nullable().describe("User's body fat percentage. Used for context only."),
});
export type SuggestProteinIntakeInput = z.infer<typeof SuggestProteinIntakeInputSchema>;

const SuggestProteinIntakeOutputSchema = z.object({
  minProteinGramsPerDay: z.number().finite().nonnegative().describe("Minimum suggested daily protein intake in grams."),
  maxProteinGramsPerDay: z.number().finite().nonnegative().describe("Maximum suggested daily protein intake in grams. Will often be the same as the minimum for a specific target."),
  minProteinFactor: z.number().finite().nonnegative().describe("The lower-bound multiplier used for calculation (e.g., 2.35 if displayUnit is 'g/kg LBM')."),
  maxProteinFactor: z.number().finite().nonnegative().describe("The upper-bound multiplier used for calculation (e.g., 2.75 if displayUnit is 'g/kg LBM')."),
  displayUnit: z.enum(['g/kg LBM', 'g/lb LBM']).describe("The unit in which min/maxProteinFactor are expressed."),
  justification: z.string().describe("Explanation of the protein recommendation based on the provided inputs and guidelines."),
});
export type SuggestProteinIntakeOutput = z.infer<typeof SuggestProteinIntakeOutputSchema>;


export async function suggestProteinIntake(input: SuggestProteinIntakeInput): Promise<SuggestProteinIntakeOutput> {
  return suggestProteinIntakeFlow(input);
}

const proteinIntakePrompt = ai.definePrompt({
  name: 'suggestProteinIntakePrompt',
  input: {schema: SuggestProteinIntakeInputSchema},
  output: {schema: SuggestProteinIntakeOutputSchema},
  prompt: `You are an AI nutrition assistant specializing in protein intake recommendations. Your calculations are based on the principle that scaling protein to fat-free mass (LBM) is the most accurate method.

User Inputs:
- Lean Body Mass (LBM): {{{leanBodyMassKg}}} kg
- Desired Recommendation Type: {{{recommendationType}}}
- Sex: {{{sex}}}
- Preferred Display Unit for Factors: {{{unitPreference}}}
- Contextual Info (Goal, Athlete Type): {{{primaryGoal}}}, {{{athleteType}}}

**GUIDELINES:**

Your primary task is to select a protein factor based on the user's 'recommendationType'. All calculations should use the provided 'leanBodyMassKg'.

| Recommendation Type | Target Group             | Factor (g/kg LBM) | Factor (g/lb LBM) |
|---------------------|--------------------------|-------------------|-------------------|
| **average**         | All individuals          | 2.35              | 1.07              |
| **safe**            | All individuals          | 2.75              | 1.25              |
| **flexible**        | Women                    | 1.95              | 0.88              |
| **flexible**        | Men / Not Specified      | 2.20              | 1.00              |

---

**YOUR TASK - Follow these steps precisely:**

1.  **Select Protein Factor.** Based on the user's 'recommendationType' and 'sex', choose the single, most appropriate protein factor from the GUIDELINES table. You will use the **g/kg LBM** value for your calculation.

2.  **Calculate Daily Protein Intake in Grams.**
    *   Let's say your chosen factor is 'factor_g_per_kg'.
    *   Calculate: 'dailyProteinGrams = factor_g_per_kg * leanBodyMassKg'.
    *   Set both 'minProteinGramsPerDay' and 'maxProteinGramsPerDay' to this calculated value.

3.  **Prepare Output Factors for Display.**
    *   The output fields 'minProteinFactor' and 'maxProteinFactor' should be the factor you chose, converted to the user's 'unitPreference'.
    *   Get the chosen factor in both g/kg and g/lb from the table.
    *   If 'unitPreference' is 'g/kgLBM', set both output factors to the 'g/kg LBM' value.
    *   If 'unitPreference' is 'g/lbLBM', set both output factors to the 'g/lb LBM' value.
    *   The 'displayUnit' output field MUST match the user's 'unitPreference'.

4.  **Provide a Human-Friendly Justification.**
    *   Create a simple, human-friendly explanation based on the user's chosen 'recommendationType'. **You must use one of the templates below, filling in the bracketed information.**
    *   **Use the 'dailyProteinGrams' value you calculated in step 2, rounded to the nearest whole number, where the template says [rounded daily grams].**

    *   **If 'recommendationType' is 'average':**
        "You selected the 'average' target. This is a strong, evidence-based goal designed to be enough to maximize muscle growth for most people. Based on your lean body mass, your daily protein target is around [rounded daily grams]g. This intake will effectively support your primary goal of {{{primaryGoal}}}."

    *   **If 'recommendationType' is 'safe':**
        "You opted for the 'safe' approach. This is our 'better safe than sorry' recommendation, providing a slightly higher intake to ensure you're getting more than enough protein to fuel your results. For your lean body mass, this comes out to a daily target of about [rounded daily grams]g. This is particularly effective for supporting your goal of {{{primaryGoal}}}."

    *   **If 'recommendationType' is 'flexible':**
        "You chose the 'flexible' target. This is a great option if you prefer a lower protein intake to allow for more dietary variety with carbs and fats, while still making great gains. Your target is around [rounded daily grams]g per day. It's worth noting this is an estimate based on a general guideline, applied to your specific lean body mass for accuracy."

Output the entire response as a single, valid JSON object that conforms EXACTLY to the 'SuggestProteinIntakeOutputSchema'. Do NOT include any text or formatting outside of this JSON object.
`,
});

const suggestProteinIntakeFlow = ai.defineFlow(
  {
    name: 'suggestProteinIntakeFlow',
    inputSchema: SuggestProteinIntakeInputSchema,
    outputSchema: SuggestProteinIntakeOutputSchema,
  },
  async (input) => {
    if (!input.leanBodyMassKg || input.leanBodyMassKg <= 0 || !isFinite(input.leanBodyMassKg)) {
      throw new Error("Valid, finite, positive Lean Body Mass (LBM) in kg is required to suggest protein intake.");
    }
    
    const {output} = await proteinIntakePrompt(input);

    if (!output) {
        throw new Error("AI failed to generate a protein intake suggestion.");
    }
    
    // Sanity check: ensure min and max are logical.
    if (output.minProteinGramsPerDay > output.maxProteinGramsPerDay) {
        console.warn("AI returned a min value greater than the max value, swapping them.");
        [output.minProteinGramsPerDay, output.maxProteinGramsPerDay] = [output.maxProteinGramsPerDay, output.minProteinGramsPerDay];
    }

    return output;
  }
);
