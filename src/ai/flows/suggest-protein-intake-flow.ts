
'use server';
/**
 * @fileOverview An AI agent that suggests protein intake for athletes.
 *
 * - suggestProteinIntake - A function that suggests protein intake.
 * - SuggestProteinIntakeInput - The input type for the suggestProteinIntake function.
 * - SuggestProteinIntakeOutput - The return type for the suggestProteinIntake function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AthleteType, PrimaryGoal, Sex } from '@/types'; // Assuming types are correctly defined

const KG_TO_LB = 2.20462;

const SuggestProteinIntakeInputSchema = z.object({
  leanBodyMassKg: z.number().positive().describe("User's lean body mass in kilograms (kg). This is required."),
  athleteType: z.enum(['endurance', 'strengthPower', 'generalFitness', 'notSpecified']).optional().default('notSpecified')
    .describe("Type of athlete (e.g., endurance, strength/power, general fitness)."),
  primaryGoal: z.enum(['fatLoss', 'muscleGain', 'maintenance', 'notSpecified']).optional().default('notSpecified')
    .describe("Primary training goal (e.g., fat loss, muscle gain, maintenance)."),
  sex: z.enum(['male', 'female', 'notSpecified']).optional().default('notSpecified')
    .describe("User's sex, as it can influence protein needs slightly."),
  unitPreference: z.enum(['g/kgLBM', 'g/lbLBM']).default('g/kgLBM')
    .describe("Preferred unit for displaying protein factors: grams per kg LBM or grams per lb LBM."),
});
export type SuggestProteinIntakeInput = z.infer<typeof SuggestProteinIntakeInputSchema>;

const SuggestProteinIntakeOutputSchema = z.object({
  minProteinGramsPerDay: z.number().describe("Minimum suggested daily protein intake in grams."),
  maxProteinGramsPerDay: z.number().describe("Maximum suggested daily protein intake in grams."),
  minProteinFactor: z.number().describe("The lower-bound multiplier used for calculation (e.g., 1.75 if displayUnit is 'g/kg LBM')."),
  maxProteinFactor: z.number().describe("The upper-bound multiplier used for calculation (e.g., 2.2 if displayUnit is 'g/kg LBM')."),
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
  prompt: `You are an AI nutrition assistant specializing in protein intake recommendations for athletes based on lean body mass (LBM).
Your recommendations should be based on the following guidelines:
- Lean body mass (LBM) is the primary factor for calculation. 1 kg = ${KG_TO_LB} lbs.
- **Endurance Athletes**:
  - General: 1.75-2.2 g/kg LBM (approximately 0.8-1.0 g/lb LBM).
  - Fat Loss: May require slightly higher end of this range or slightly above.
  - Women: May sometimes manage with slightly less within the recommended range.
- **Strength/Power Athletes**:
  - General: 2.2-2.5 g/kg LBM (approximately 1.0-1.2 g/lb LBM).
  - Fat Loss (Dieting): Can go as high as 3.0-3.5 g/kg LBM (approximately 1.4-1.5 g/lb LBM).
- **General Fitness / Not Specified Athlete Type**:
  - Aim for a moderate range, e.g., 1.6-2.2 g/kg LBM. Adjust based on goal (e.g., higher for muscle gain/fat loss).
- **Considerations**:
  - If 'sex' is 'female', you can suggest values towards the lower end of the applicable range if appropriate, but ensure it's still adequate for the athlete type and goal.
  - If 'primaryGoal' is 'fatLoss', lean towards the higher end of the range for the given athlete type, or use the specific 'dieting' ranges if applicable.
  - If 'primaryGoal' is 'muscleGain', ensure intake is robust, typically mid to high end of the general range for their athlete type.
  - If 'primaryGoal' is 'maintenance' or 'notSpecified', use the general range for their athlete type.

User Inputs:
- Lean Body Mass (LBM): {{{leanBodyMassKg}}} kg
- Athlete Type: {{{athleteType}}}
- Primary Goal: {{{primaryGoal}}}
- Sex: {{{sex}}}
- Preferred Display Unit for Factors: {{{unitPreference}}}

Task:
1.  Determine the appropriate protein intake factors (min and max g/kg LBM) based on the user's inputs and the guidelines.
2.  Calculate the suggested daily protein intake range in GRAMS PER DAY (minProteinGramsPerDay, maxProteinGramsPerDay) using the LBM in kg.
3.  For the 'minProteinFactor' and 'maxProteinFactor' output fields:
    - If 'unitPreference' is 'g/kgLBM', these factors should be the direct g/kg LBM values you used.
    - If 'unitPreference' is 'g/lbLBM', CONVERT the g/kg LBM factors to g/lb LBM factors (divide by ${KG_TO_LB}).
4.  Set the 'displayUnit' output field to match 'unitPreference'.
5.  Provide a concise 'justification' (2-4 sentences) explaining your reasoning, referencing the specific guidelines used.

Output the entire response as a single, valid JSON object that conforms EXACTLY to the 'SuggestProteinIntakeOutputSchema'. Do NOT include any text or formatting outside of this JSON object.
Ensure all numerical outputs are numbers, not strings.
Example for factor conversion: If you used 2.0 g/kg LBM and preference is g/lb LBM, the factor output would be 2.0 / ${KG_TO_LB}.
`,
});

const suggestProteinIntakeFlow = ai.defineFlow(
  {
    name: 'suggestProteinIntakeFlow',
    inputSchema: SuggestProteinIntakeInputSchema,
    outputSchema: SuggestProteinIntakeOutputSchema,
  },
  async (input) => {
    if (!input.leanBodyMassKg || input.leanBodyMassKg <= 0) {
      throw new Error("Valid Lean Body Mass (LBM) in kg is required to suggest protein intake.");
    }

    const {output} = await proteinIntakePrompt(input);

    if (!output) {
        throw new Error("AI failed to generate a protein intake suggestion.");
    }
    
    // Ensure the output factors are reasonably converted if needed.
    // The prompt guides the AI, but a sanity check or re-calc here could be added if AI struggles with conversion.
    // For now, trust the AI based on the detailed prompt.

    return output;
  }
);

