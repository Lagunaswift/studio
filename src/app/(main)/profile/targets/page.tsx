
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
import { useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

  return (
    <PageWrapper title="Dietary Targets">
      <Card className="max-w-lg mx-auto">
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
                    <FormLabel>Protein (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input type="number" {...field} readOnly className="bg-muted/50" />
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
