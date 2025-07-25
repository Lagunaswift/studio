
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle, Leaf } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

const AVAILABLE_DIETARY_PREFERENCES = [
  "Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free", "Low Carb", "Keto"
];

const AVAILABLE_ALLERGENS = [
  "Nuts", "Peanuts", "Dairy", "Eggs", "Soy", "Gluten", "Fish", "Shellfish", "Sesame", "Mustard"
];

const dietAndAllergensSchema = z.object({
  dietaryPreferences: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
});

type DietAndAllergensFormValues = z.infer<typeof dietAndAllergensSchema>;

export default function DietAndAllergensPage() {
  const { userProfile, setUserInformation } = useAppContext();
  const { toast } = useToast();
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [formData, setFormData] = useState<DietAndAllergensFormValues | null>(null);

  const form = useForm<DietAndAllergensFormValues>({
    resolver: zodResolver(dietAndAllergensSchema),
    defaultValues: {
      dietaryPreferences: userProfile?.dietaryPreferences || [],
      allergens: userProfile?.allergens || [],
    },
  });

  useEffect(() => {
    if (userProfile) {
        form.reset({
            dietaryPreferences: userProfile.dietaryPreferences || [],
            allergens: userProfile.allergens || [],
        });
    }
  }, [userProfile, form]);

  const handleConfirmSubmit = async () => {
    if (formData) {
      try {
        await setUserInformation({ 
            dietaryPreferences: formData.dietaryPreferences, 
            allergens: formData.allergens 
        });
        toast({
            title: "Settings Updated",
            description: "Your diet and allergen preferences have been saved.",
        });
        form.reset(formData);
      } catch (error: any) {
        toast({
          title: "Error Updating Settings",
          description: error.message || "Could not save your preferences.",
          variant: "destructive",
        });
      } finally {
        setFormData(null);
        setIsAlertOpen(false);
      }
    } else {
        setIsAlertOpen(false);
    }
  };
  
  const onFormSubmit: SubmitHandler<DietAndAllergensFormValues> = async (data) => {
    // Show warning only if a new allergen is being selected
    const initialAllergens = new Set(userProfile?.allergens || []);
    const addedAllergens = data.allergens.filter(a => !initialAllergens.has(a));

    if (addedAllergens.length > 0) {
        setFormData(data);
        setIsAlertOpen(true);
    } else {
        // If no new allergens are added, or if allergens are only removed, save directly.
        try {
            await setUserInformation({ 
                dietaryPreferences: data.dietaryPreferences, 
                allergens: data.allergens 
            });
            toast({
                title: "Settings Updated",
                description: "Your diet and allergen preferences have been saved.",
            });
            form.reset(data);
        } catch (error: any) {
             toast({
              title: "Error Updating Settings",
              description: error.message || "Could not save your preferences.",
              variant: "destructive",
            });
        }
    }
  };

  return (
    <PageWrapper title="Diet & Allergen Settings">
      <Card className="max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center"><Leaf className="mr-2 h-5 w-5 text-accent"/> Dietary & Allergen Preferences</CardTitle>
              <CardDescription>Select your preferences to help filter recipes and AI suggestions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               {/* Dietary Preferences Section */}
               <div>
                  <h3 className="text-lg font-medium mb-3 text-primary">Dietary Preferences</h3>
                   <FormField
                    control={form.control}
                    name="dietaryPreferences"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-4">
                          {AVAILABLE_DIETARY_PREFERENCES.map((preference) => (
                            <FormField
                              key={preference}
                              control={form.control}
                              name="dietaryPreferences"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(preference)}
                                      onCheckedChange={(checked) => {
                                        const newValue = checked
                                          ? [...(field.value || []), preference]
                                          : (field.value || []).filter((value) => value !== preference);
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>

                <Separator />
               
               {/* Allergens Section */}
               <div>
                    <h3 className="text-lg font-medium mb-3 text-primary">Allergens to Avoid</h3>
                     <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Important Health & Safety Notice</AlertTitle>
                        <AlertDescription>
                          This allergen filter helps hide recipes containing common keywords, but it is NOT a substitute for medical advice or carefully reading ingredient labels. You are responsible for verifying all ingredients before consumption.
                        </AlertDescription>
                    </Alert>
                   <FormField
                    control={form.control}
                    name="allergens"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-4">
                          {AVAILABLE_ALLERGENS.map((allergen) => (
                            <FormField
                              key={allergen}
                              control={form.control}
                              name="allergens"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(allergen)}
                                      onCheckedChange={(checked) => {
                                        const newValue = checked
                                          ? [...(field.value || []), allergen]
                                          : (field.value || []).filter((value) => value !== allergen);
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-destructive" />
              Health & Safety Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have selected an allergen filter. This feature works by checking for common keywords but is NOT a substitute for medical advice or reading ingredient labels.
              <br/><br/>
              Recipes and product ingredients can change. For your safety, you MUST verify all ingredients yourself before purchasing or consuming any food.
              <br/><br/>
              By clicking 'Accept', you acknowledge that you are fully responsible for managing your own dietary needs and that this app is not liable for any adverse reactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} className="bg-accent hover:bg-accent/90">
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
