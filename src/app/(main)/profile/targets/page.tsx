
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { MacroTargets } from '@/types';
import { useEffect, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { suggestProteinIntake, type SuggestProteinIntakeInput, type SuggestProteinIntakeOutput } from '@/ai/flows/suggest-protein-intake-flow';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, Info, Lightbulb, Droplets, AlertTriangle } from "lucide-react";
import Link from 'next/link';

const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive").default(0),
  protein: z.coerce.number().min(0, "Protein must be positive").default(0),
  carbs: z.coerce.number().min(0, "Carbs must be positive").default(0),
  fat: z.coerce.number().min(0, "Fat must be positive").default(0),
});

type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;

interface FatSuggestion {
  suggestedFatGrams: number;
  justification: string;
}

export default function DietaryTargetsPage() {
  const { userProfile, setMacroTargets } = useAppContext();
  const { toast } = useToast();
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [proteinSuggestion, setProteinSuggestion] = useState<SuggestProteinIntakeOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [fatSuggestion, setFatSuggestion] = useState<FatSuggestion | null>(null);
  const [fatSuggestionError, setFatSuggestionError] = useState<string | null>(null);

  // NEW states for warnings
  const [weightLossWarning, setWeightLossWarning] = useState<string | null>(null);
  const [energyAvailabilityWarning, setEnergyAvailabilityWarning] = useState<string | null>(null);


  const macroForm = useForm<MacroTargetFormValues>({
    resolver: zodResolver(macroTargetSchema),
    defaultValues: userProfile?.macroTargets || { calories: 0, protein: 150, carbs: 200, fat: 60 },
  });

  useEffect(() => {
    if (userProfile?.macroTargets) {
      macroForm.reset(userProfile.macroTargets);
    } else {
       macroForm.reset({ calories: 0, protein: 150, carbs: 200, fat: 60 });
    }
  }, [userProfile?.macroTargets, macroForm]);

  const proteinValue = macroForm.watch("protein");
  const carbsValue = macroForm.watch("carbs");
  const fatValue = macroForm.watch("fat");
  const caloriesValue = macroForm.watch("calories");

  useEffect(() => {
    const protein = parseFloat(proteinValue as any) || 0;
    const carbs = parseFloat(carbsValue as any) || 0;
    const fat = parseFloat(fatValue as any) || 0;
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);

    const currentCalories = macroForm.getValues("calories");
    if (Math.round(calculatedCalories) !== Math.round(currentCalories)) {
      macroForm.setValue("calories", Math.round(calculatedCalories), {
        shouldValidate: true,
        shouldDirty: true
      });
    }
  }, [proteinValue, carbsValue, fatValue, macroForm]);

  // NEW useEffect for warnings
  useEffect(() => {
    if (!userProfile || !caloriesValue || isNaN(caloriesValue) || caloriesValue <= 0) {
        setWeightLossWarning(null);
        setEnergyAvailabilityWarning(null);
        return;
    }

    const { tdee, weightKg, sex, leanBodyMassKg } = userProfile;

    // Weight loss check
    if (tdee && weightKg && tdee > caloriesValue) {
        const deficit = tdee - caloriesValue;
        const weeklyKgLoss = (deficit * 7) / 7700; // 7700 kcal per kg of fat
        const weeklyPercentageLoss = (weeklyKgLoss / weightKg) * 100;

        if (weeklyPercentageLoss > 1) {
            setWeightLossWarning(
                `A target of ${Math.round(caloriesValue)} kcal may lead to a weekly weight loss of over 1% of your body mass. Rapid weight loss can be unsustainable and may risk muscle loss. A daily deficit of around ${Math.round((weightKg * 0.01 * 7700) / 7)} kcal is generally a safer upper limit.`
            );
        } else {
            setWeightLossWarning(null);
        }
    } else {
        setWeightLossWarning(null);
    }

    // Low Energy Availability check for females
    if (sex === 'female' && leanBodyMassKg) {
        const energyPerLbm = caloriesValue / leanBodyMassKg;
        if (energyPerLbm < 30) {
            setEnergyAvailabilityWarning(
                `For females, an intake below 30-45 kcal per kg of lean body mass can increase health risks, including impacts on metabolic rate and menstrual function. Please consult a healthcare professional if you have concerns.`
            );
        } else {
            setEnergyAvailabilityWarning(null);
        }
    } else {
        setEnergyAvailabilityWarning(null);
    }
  }, [caloriesValue, userProfile]);


  const handleMacroSubmit: SubmitHandler<MacroTargetFormValues> = (data) => {
    setMacroTargets(data);
    toast({
      title: "Macro Targets Updated",
      description: "Your daily caloric and macro targets have been saved.",
    });
    macroForm.reset(data); 
  };

  const handleGetProteinSuggestion = async () => {
    if (!userProfile || !userProfile.leanBodyMassKg) {
      setAiError("Please complete your User Information (especially weight and body fat %) to calculate Lean Body Mass for an accurate protein suggestion.");
      toast({
        title: "User Info Needed",
        description: (
          <span>
            Complete your <Link href="/profile/user-info" className="underline">User Information</Link> to get a protein suggestion.
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    setIsAISuggesting(true);
    setProteinSuggestion(null);
    setAiError(null);
    setFatSuggestion(null); 
    setFatSuggestionError(null);


    try {
      const input: SuggestProteinIntakeInput = {
        leanBodyMassKg: userProfile.leanBodyMassKg,
        athleteType: userProfile.athleteType || 'notSpecified',
        primaryGoal: userProfile.primaryGoal || 'notSpecified',
        sex: userProfile.sex || 'notSpecified',
        unitPreference: 'g/kgLBM', 
      };
      const suggestion = await suggestProteinIntake(input);
      setProteinSuggestion(suggestion);
    } catch (error: any) {
      console.error("AI Protein Suggestion Error:", error);
      let detailedMessage = "Failed to get protein suggestion.";
      if (error.message) {
        detailedMessage = error.message;
      }
      if (error.digest) {
         detailedMessage += ` Server error digest: ${error.digest}. Check server logs for more details. Ensure your GOOGLE_API_KEY is correctly set up.`;
      } else {
        detailedMessage += " This might be a server-side issue. Check server logs for more details and ensure your GOOGLE_API_KEY is correctly set up if using AI features.";
      }
      setAiError(detailedMessage);
      toast({
        title: "AI Suggestion Error",
        description: detailedMessage,
        variant: "destructive",
      });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const applyProteinSuggestion = () => {
    if (proteinSuggestion) {
      const averageProtein = Math.round((proteinSuggestion.minProteinGramsPerDay + proteinSuggestion.maxProteinGramsPerDay) / 2);
      macroForm.setValue("protein", averageProtein, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Protein Target Applied",
        description: `Protein set to ${averageProtein}g. Adjust other macros as needed.`,
      });
    }
  };

  const handleGetFatSuggestion = () => {
    setProteinSuggestion(null);
    setAiError(null);
    setFatSuggestion(null);
    setFatSuggestionError(null);

    if (!userProfile) {
        setFatSuggestionError("User profile not loaded. Please try refreshing.");
        return;
    }
    if (!userProfile.tdee) {
        setFatSuggestionError("TDEE (Total Daily Energy Expenditure) is not calculated. Please complete your User Info (height, weight, age, sex, activity level) on the User Info page.");
        toast({
            title: "TDEE Needed for Fat Suggestion",
            description: (
                <span>
                    Complete your <Link href="/profile/user-info" className="underline">User Information</Link> to calculate TDEE.
                </span>
            ),
            variant: "destructive",
        });
        return;
    }

    const suggestedFatGrams = (userProfile.tdee * 0.30) / 9; // Using a general 30% rule
    setFatSuggestion({
        suggestedFatGrams: Math.round(suggestedFatGrams),
        justification: `A balanced starting point for dietary fat is 20-35% of total daily calories. Based on your estimated TDEE of ~${userProfile.tdee.toFixed(0)} kcal, a target of 30% suggests approximately ${Math.round(suggestedFatGrams)}g of fat per day. This provides essential fatty acids and supports hormone function.`,
    });
  };

  const applyFatSuggestion = () => {
    if (fatSuggestion) {
      macroForm.setValue("fat", fatSuggestion.suggestedFatGrams, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Fat Target Applied",
        description: `Fat set to ${fatSuggestion.suggestedFatGrams}g. Adjust other macros as needed.`,
      });
    }
  };


  return (
    <PageWrapper title="Dietary Targets">
       <Alert className="mb-8 border-accent">
        <Lightbulb className="h-4 w-4" />
        <AlertTitle className="font-semibold text-accent">How to Set Your Targets for Fat Loss or Muscle Gain</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>First, complete your <Link href="/profile/user-info" className="underline hover:text-primary">User Info</Link> page to calculate your TDEE (Total Daily Energy Expenditure).</li>
            <li>Use the 'Suggest Protein' and 'Suggest Fat' buttons below to get AI-powered and calculated starting points for these macros.</li>
            <li>Finally, adjust your 'Carbohydrates' input to set your total daily calories. For **fat loss**, aim for your total calories to be below your TDEE. For **muscle gain**, aim for a slight surplus above your TDEE.</li>
          </ul>
        </AlertDescription>
      </Alert>
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Caloric & Macro Targets</CardTitle>
          <CardDescription>Set your daily nutritional goals. Calories are auto-calculated based on protein, carbs, and fat.</CardDescription>
        </CardHeader>
        <Form {...macroForm}>
          <form onSubmit={macroForm.handleSubmit(handleMacroSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={macroForm.control}
                name="protein"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Protein (g)</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={handleGetProteinSuggestion} disabled={isAISuggesting}>
                        {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-accent" />}
                        Suggest Protein
                      </Button>
                    </div>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {aiError && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>AI Suggestion Error</AlertTitle>
                  <AlertDescription>{aiError}</AlertDescription>
                </Alert>
              )}

              {proteinSuggestion && !isAISuggesting && (
                <Card className="bg-secondary/50 p-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-md flex items-center text-primary">
                      <Lightbulb className="w-5 h-5 mr-2 text-accent" /> AI Protein Suggestion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 text-sm space-y-2">
                    <p>
                      Suggested Range: <strong>{proteinSuggestion.minProteinGramsPerDay.toFixed(0)}g - {proteinSuggestion.maxProteinGramsPerDay.toFixed(0)}g per day</strong>
                    </p>
                    <p>
                      (Factors: {proteinSuggestion.minProteinFactor.toFixed(2)} - {proteinSuggestion.maxProteinFactor.toFixed(2)} {proteinSuggestion.displayUnit})
                    </p>
                    <p className="text-xs text-muted-foreground italic">Justification: {proteinSuggestion.justification}</p>
                    <Button type="button" size="sm" onClick={applyProteinSuggestion} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                      Apply Suggestion (Average: {Math.round((proteinSuggestion.minProteinGramsPerDay + proteinSuggestion.maxProteinGramsPerDay) / 2)}g)
                    </Button>
                  </CardContent>
                </Card>
              )}

              <FormField
                control={macroForm.control}
                name="carbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carbohydrates (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={macroForm.control}
                name="fat"
                render={({ field }) => (
                   <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Fat (g)</FormLabel>
                       <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={handleGetFatSuggestion}
                          disabled={!userProfile || !userProfile.tdee}
                          title={!userProfile || !userProfile.tdee ? "Requires user info to calculate TDEE" : "Get Suggestion"}
                        >
                         <Droplets className="mr-2 h-4 w-4 text-accent" />
                         Suggest Fat
                       </Button>
                    </div>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fatSuggestionError && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Suggestion Info</AlertTitle>
                  <AlertDescription>{fatSuggestionError} <Link href="/profile/user-info" className="underline">Update User Info here.</Link></AlertDescription>
                </Alert>
              )}

              {fatSuggestion && !fatSuggestionError && (
                <Card className="bg-secondary/50 p-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-md flex items-center text-primary">
                      <Lightbulb className="w-5 h-5 mr-2 text-accent" /> Fat Intake Suggestion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 text-sm space-y-2">
                    <p>
                      Suggested Fat: <strong>~{fatSuggestion.suggestedFatGrams}g per day</strong>
                    </p>
                    <p className="text-xs text-muted-foreground italic">{fatSuggestion.justification}</p>
                    <Button type="button" size="sm" onClick={applyFatSuggestion} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                      Apply Suggestion ({fatSuggestion.suggestedFatGrams}g)
                    </Button>
                  </CardContent>
                </Card>
              )}


              <FormField
                control={macroForm.control}
                name="calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calculated Calories (kcal)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} readOnly className="bg-muted/50 cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(weightLossWarning || energyAvailabilityWarning) && (
                <div className="space-y-4 pt-4">
                  {weightLossWarning && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Potential for Rapid Weight Loss</AlertTitle>
                      <AlertDescription>{weightLossWarning}</AlertDescription>
                    </Alert>
                  )}
                  {energyAvailabilityWarning && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Low Energy Availability Warning</AlertTitle>
                      <AlertDescription>{energyAvailabilityWarning}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={macroForm.formState.isSubmitting || !macroForm.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {macroForm.formState.isSubmitting ? "Saving..." : "Save Macro Targets"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </PageWrapper>
  );
}

