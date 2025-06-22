
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
import { Sparkles, Loader2, Info, Lightbulb, Droplets } from "lucide-react";
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
      setFatSuggestionError(
        "TDEE (Total Daily Energy Expenditure) is not calculated. Please complete your User Info (height, weight, age, sex, activity level) on the User Info page."
      );
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
    if (userProfile.sex !== 'female') {
      setFatSuggestionError(
        "This specific fat suggestion (around 33% of TDEE) is tailored for female profiles based on common guidelines. Your profile sex is not set to 'female'."
      );
      return;
    }

    const suggestedFatGrams = (userProfile.tdee * 0.33) / 9;
    setFatSuggestion({
      suggestedFatGrams: Math.round(suggestedFatGrams),
      justification: `General guidelines suggest dietary fat can make up 20-35% of total daily calories. For women, aiming towards 33% of TDEE (your TDEE is ~${userProfile.tdee.toFixed(0)} kcal) can be beneficial for hormone health and satiety. This suggests approximately ${Math.round(suggestedFatGrams)}g of fat per day.`,
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
                          disabled={!userProfile || !userProfile.tdee || userProfile.sex !== 'female'}
                          title={!userProfile || !userProfile.tdee || userProfile.sex !== 'female' ? "Requires user info (TDEE & Sex='female')" : "Get Suggestion"}
                        >
                         <Droplets className="mr-2 h-4 w-4 text-accent" />
                         Suggest Fat (Women)
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
                  <AlertTitle>Fat Suggestion Info</AlertTitle>
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
