
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label is used for non-Form items, keep this. FormLabel is used within FormField.
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { UserProfileSettings } from '@/types'; // MacroTargets is part of UserProfileSettings
import { useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Form Schemas
const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive").default(0),
  protein: z.coerce.number().min(0, "Protein must be positive").default(0),
  carbs: z.coerce.number().min(0, "Carbs must be positive").default(0),
  fat: z.coerce.number().min(0, "Fat must be positive").default(0),
});

const preferencesSchema = z.object({
  dietaryPreferences: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
});

type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;
type PreferencesFormValues = z.infer<typeof preferencesSchema>;

// Available options for checkboxes
const AVAILABLE_DIETARY_PREFERENCES = [
  "Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free", "Low Carb", "Keto"
];
const AVAILABLE_ALLERGENS = [
  "Nuts", "Peanuts", "Dairy", "Eggs", "Soy", "Gluten", "Fish", "Shellfish", "Sesame", "Mustard"
];

export default function ProfilePage() {
  const { userProfile, setMacroTargets, setDietaryPreferences, setAllergens } = useAppContext();
  const { toast } = useToast();

  const macroForm = useForm<MacroTargetFormValues>({
    resolver: zodResolver(macroTargetSchema),
    defaultValues: userProfile?.macroTargets || { calories: 0, protein: 150, carbs: 200, fat: 60 },
  });

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      dietaryPreferences: userProfile?.dietaryPreferences || [],
      allergens: userProfile?.allergens || [],
    },
  });

  // Effect to update macro form when userProfile changes
  useEffect(() => {
    if (userProfile?.macroTargets) {
      macroForm.reset(userProfile.macroTargets);
    }
  }, [userProfile?.macroTargets, macroForm]);

  // Effect to update preferences form when userProfile changes
  useEffect(() => {
    preferencesForm.reset({
      dietaryPreferences: userProfile?.dietaryPreferences || [],
      allergens: userProfile?.allergens || [],
    });
  }, [userProfile?.dietaryPreferences, userProfile?.allergens, preferencesForm]);


  // Auto-calculate calories
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
    macroForm.reset(data); // Simpler reset
  };

  const handlePreferencesSubmit: SubmitHandler<PreferencesFormValues> = (data) => {
    setDietaryPreferences(data.dietaryPreferences);
    setAllergens(data.allergens);
    toast({
      title: "Preferences Updated",
      description: "Your dietary preferences and allergen filters have been saved.",
    });
    preferencesForm.reset(data); // Simpler reset
  };

  return (
    <PageWrapper title="Profile Settings">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Macro Targets Card */}
        <Card>
          <CardHeader>
            <CardTitle>Caloric & Macro Targets</CardTitle>
            <CardDescription>Set your daily nutritional goals.</CardDescription>
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

        {/* Dietary & Allergen Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Dietary & Allergen Filters</CardTitle>
            <CardDescription>Specify your dietary needs and restrictions.</CardDescription>
          </CardHeader>
          <Form {...preferencesForm}>
            <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)}>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Dietary Preferences</h3>
                  <div className="space-y-2">
                    {AVAILABLE_DIETARY_PREFERENCES.map((preference) => (
                      <FormField
                        key={preference}
                        control={preferencesForm.control}
                        name="dietaryPreferences"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(preference)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  let newValue;
                                  if (checked) {
                                    newValue = [...currentValue, preference];
                                  } else {
                                    newValue = currentValue.filter(
                                      (value) => value !== preference
                                    );
                                  }
                                  field.onChange(newValue);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {preference}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Allergens to Avoid</h3>
                  <div className="space-y-2">
                    {AVAILABLE_ALLERGENS.map((allergen) => (
                      <FormField
                        key={allergen}
                        control={preferencesForm.control}
                        name="allergens"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(allergen)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  let newValue;
                                  if (checked) {
                                    newValue = [...currentValue, allergen];
                                  } else {
                                    newValue = currentValue.filter(
                                      (value) => value !== allergen
                                    );
                                  }
                                  field.onChange(newValue);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {allergen}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={preferencesForm.formState.isSubmitting || !preferencesForm.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {preferencesForm.formState.isSubmitting ? "Saving..." : "Save Preferences & Filters"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </PageWrapper>
  );
}

    
