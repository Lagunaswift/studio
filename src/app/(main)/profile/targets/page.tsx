
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
import { Sparkles, Loader2, Info, Lightbulb } from "lucide-react";
import Link from 'next/link';

const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive").default(0),
  protein: z.coerce.number().min(0, "Protein must be positive").default(0),
  carbs: z.coerce.number().min(0, "Carbs must be positive").default(0),
  fat: z.coerce.number().min(0, "Fat must be positive").default(0),
});

type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;

export default function DietaryTargetsPage() {
  const { userProfile, setMacroTargets } = useAppContext();
  const { toast } = useToast();
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [proteinSuggestion, setProteinSuggestion] = useState<SuggestProteinIntakeOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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
    macroForm.reset(data); // Resets dirty state
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

    try {
      const input: SuggestProteinIntakeInput = {
        leanBodyMassKg: userProfile.leanBodyMassKg,
        athleteType: userProfile.athleteType || 'notSpecified',
        primaryGoal: userProfile.primaryGoal || 'notSpecified',
        sex: userProfile.sex || 'notSpecified',
        unitPreference: 'g/kgLBM', // Or make this a user choice
      };
      const suggestion = await suggestProteinIntake(input);
      setProteinSuggestion(suggestion);
    } catch (error: any) {
      console.error("AI Protein Suggestion Error:", error);
      setAiError(error.message || "Failed to get protein suggestion.");
      toast({
        title: "AI Suggestion Error",
        description: error.message || "Could not fetch protein suggestion.",
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
                  <AlertTitle>Suggestion Error</AlertTitle>
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
                    <FormLabel>Fat (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
