
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
const LB_TO_KG = 1 / KG_TO_LB;

const SuggestProteinIntakeInputSchema = z.object({
  leanBodyMassKg: z.number().finite().positive().describe("User's lean body mass in kilograms (kg). This is required."),
  bodyFatPercentage: z.number().finite().positive().optional().nullable().describe("User's body fat percentage. Required for female-specific calculations."),
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
  minProteinGramsPerDay: z.number().finite().nonnegative().describe("Minimum suggested daily protein intake in grams."),
  maxProteinGramsPerDay: z.number().finite().nonnegative().describe("Maximum suggested daily protein intake in grams."),
  minProteinFactor: z.number().finite().nonnegative().describe("The lower-bound multiplier used for calculation (e.g., 1.75 if displayUnit is 'g/kg LBM')."),
  maxProteinFactor: z.number().finite().nonnegative().describe("The upper-bound multiplier used for calculation (e.g., 2.2 if displayUnit is 'g/kg LBM')."),
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
Your primary calculation unit is grams per pound of LBM (g/lb LBM). 1 lb = ${LB_TO_KG.toFixed(4)} kg.

User Inputs:
- Lean Body Mass (LBM): {{{leanBodyMassKg}}} kg
- Body Fat Percentage: {{#if bodyFatPercentage}}{{{bodyFatPercentage}}}%{{else}}Not provided{{/if}}
- Athlete Type: {{{athleteType}}}
- Primary Goal: {{{primaryGoal}}}
- Sex: {{{sex}}}
- Preferred Display Unit for Factors: {{{unitPreference}}}

**GUIDELINES:**

**Part 1: Female-Specific Guidelines (ONLY use if sex is 'female' and bodyFatPercentage is provided)**

1.  First, determine the Body Fat Category for the female user:
    *   **Category 1:** Body Fat < 22%
    *   **Category 2:** Body Fat 22% - 30%
    *   **Category 3:** Body Fat > 30%
2.  Second, determine the Activity Type:
    *   **I (Inactive):** 'athleteType' is 'generalFitness' or 'notSpecified'.
    *   **A (Aerobic/Cardio):** 'athleteType' is 'endurance'.
    *   **W (Weightlifting):** 'athleteType' is 'strengthPower'.
3.  Third, use the table below to find the protein factor range in **g/lb of LBM**.

|             | Maintenance (I, A, W) | Dieting (I, A, W)   | Gaining/Max |
|-------------|-----------------------|---------------------|-------------|
| **Category 1** | 0.7, 0.8, 0.9         | 0.9, 1.0, 1.1-1.2   | 1.2-1.4     |
| **Category 2** | 0.6, 0.7, 0.8         | 0.8, 0.9, 0.9-1.0   | 1.0-1.2     |
| **Category 3** | 0.5, 0.6, 0.7         | 0.7, 0.8, 0.8-0.9   | 0.9-1.0     |

*   Note: For the 'Gaining/Max' column ('primaryGoal' is 'muscleGain'), the range applies to all activity types.

**Part 2: Male and General Guidelines (Use if sex is 'male', or 'female' without bodyFatPercentage, or 'notSpecified')**

Use these general protein factor ranges in **g/lb of LBM**:
*   **Endurance Athletes**: 0.8-1.0 g/lb LBM.
*   **Strength/Power Athletes**: 1.0-1.2 g/lb LBM.
*   **General Fitness / Not Specified**: 0.7-1.0 g/lb LBM.
*   **Fat Loss (Dieting) for Strength/Power Athletes**: Can go as high as 1.4-1.5 g/lb LBM.
*   **Considerations**: Lean towards the higher end of the range for fat loss goals.

---

**YOUR TASK - Follow these steps precisely:**

1.  **Select Guidelines.**
    *   If the user's \`sex\` is 'female' AND they provided a \`bodyFatPercentage\`, you MUST use the guidelines in **Part 1**.
    *   For ALL OTHER users (male, or female without body fat %), you MUST use the guidelines in **Part 2**.

2.  **Determine Protein Factor Range in g/lb LBM.**
    Using the selected guidelines from Step 1, find the appropriate protein factor range. This gives you \`minFactor_g_per_lb\` and \`maxFactor_g_per_lb\`. These factors are in **grams per POUND of LBM**.

3.  **Convert User's LBM to Pounds.**
    The user's LBM is provided in kg. You MUST convert this to pounds for the calculation.
    \`LBM_lbs = leanBodyMassKg * ${KG_TO_LB}\`.
    Example: If leanBodyMassKg is 75, then LBM_lbs is 75 * 2.20462 = 165.35 lbs.

4.  **Calculate Daily Protein Intake in Grams.**
    Use the LBM in pounds from Step 3 and the factors from Step 2.
    \`minProteinGramsPerDay = minFactor_g_per_lb * LBM_lbs\`
    \`maxProteinGramsPerDay = maxFactor_g_per_lb * LBM_lbs\`
    This calculation is CRITICAL. DO NOT multiply kg by g/lb factors, or lbs by g/kg factors.

5.  **Prepare Output Factors for Display.**
    The output fields \`minProteinFactor\` and \`maxProteinFactor\` depend on the user's 'unitPreference'.
    *   If 'unitPreference' is 'g/lbLBM', use the factors from Step 2.
    *   If 'unitPreference' is 'g/kgLBM', you MUST CONVERT the factors from Step 2.
        \`outputMinFactor_g_per_kg = minFactor_g_per_lb * ${KG_TO_LB}\`
        \`outputMaxFactor_g_per_kg = maxFactor_g_per_lb * ${KG_TO_LB}\`
    Set the 'displayUnit' output field to match 'unitPreference'.

6.  **Provide Justification.**
    Provide a concise 'justification' (2-4 sentences) explaining your reasoning, referencing the specific guidelines and user inputs used.

Output the entire response as a single, valid JSON object that conforms EXACTLY to the 'SuggestProteinIntakeOutputSchema'. Do NOT include any text or formatting outside of this JSON object.
Ensure all numerical outputs are numbers, not strings.
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

    if (input.sex === 'female' && (!input.bodyFatPercentage || input.bodyFatPercentage <= 0)) {
        console.warn("Female user without body fat percentage; falling back to general guidelines.");
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
