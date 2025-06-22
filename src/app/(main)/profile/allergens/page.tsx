
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

const AVAILABLE_ALLERGENS = [
  "Nuts", "Peanuts", "Dairy", "Eggs", "Soy", "Gluten", "Fish", "Shellfish", "Sesame", "Mustard"
];

const allergensSchema = z.object({
  allergens: z.array(z.string()).default([]),
});

type AllergensFormValues = z.infer<typeof allergensSchema>;

export default function AllergensPage() {
  const { userProfile, setAllergens } = useAppContext();
  const { toast } = useToast();
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [formData, setFormData] = useState<AllergensFormValues | null>(null);

  const allergensForm = useForm<AllergensFormValues>({
    resolver: zodResolver(allergensSchema),
    defaultValues: {
      allergens: userProfile?.allergens || [],
    },
  });

  useEffect(() => {
    allergensForm.reset({
      allergens: userProfile?.allergens || [],
    });
  }, [userProfile?.allergens, allergensForm]);

  const handleConfirmSubmit = () => {
    if (formData) {
        setAllergens(formData.allergens);
        toast({
            title: "Allergens Updated",
            description: "Your allergen filters have been saved.",
        });
        allergensForm.reset(formData);
        setFormData(null);
    }
    setIsAlertOpen(false);
  };
  
  const onFormSubmit: SubmitHandler<AllergensFormValues> = (data) => {
    if (data.allergens.length > 0) {
        setFormData(data);
        setIsAlertOpen(true);
    } else {
        // If no allergens are selected, just save directly without a warning
        setAllergens(data.allergens);
        toast({
            title: "Allergens Cleared",
            description: "Your allergen filters have been cleared.",
        });
        allergensForm.reset(data);
    }
  };

  return (
    <PageWrapper title="Allergen Filters">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Allergens to Avoid</CardTitle>
          <CardDescription>Select any allergens you need to avoid. This can help in filtering recipes and AI suggestions.</CardDescription>
        </CardHeader>
        <Form {...allergensForm}>
          <form onSubmit={allergensForm.handleSubmit(onFormSubmit)}>
            <CardContent className="space-y-4">
               <FormField
                control={allergensForm.control}
                name="allergens"
                render={() => (
                  <FormItem>
                    <div className="space-y-2">
                      {AVAILABLE_ALLERGENS.map((allergen) => (
                        <FormField
                          key={allergen}
                          control={allergensForm.control}
                          name="allergens"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(allergen)}
                                  onCheckedChange={(checked) => {
                                    setTimeout(() => { // Defer state update
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
                                    }, 0);
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={allergensForm.formState.isSubmitting || !allergensForm.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {allergensForm.formState.isSubmitting ? "Saving..." : "Save Allergen Filters"}
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
              You have selected a filter for a potential allergen. This filter works by checking for common ingredients but is NOT a substitute for medical advice or reading ingredient labels.
              <br/><br/>
              Recipes and product ingredients can change. For your safety, you MUST verify all ingredients yourself before purchasing or consuming any food.
              <br/><br/>
              By clicking 'Accept', you acknowledge that you are fully responsible for managing your own dietary needs and that Macro Teal Meal Planner is not liable for any adverse reactions.
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
