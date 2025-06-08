
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
import { useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const AVAILABLE_DIETARY_PREFERENCES = [
  "Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free", "Low Carb", "Keto"
];

const dietTypeSchema = z.object({
  dietaryPreferences: z.array(z.string()).default([]),
});

type DietTypeFormValues = z.infer<typeof dietTypeSchema>;

export default function DietTypePage() {
  const { userProfile, setDietaryPreferences } = useAppContext();
  const { toast } = useToast();

  const dietTypeForm = useForm<DietTypeFormValues>({
    resolver: zodResolver(dietTypeSchema),
    defaultValues: {
      dietaryPreferences: userProfile?.dietaryPreferences || [],
    },
  });

  useEffect(() => {
    dietTypeForm.reset({
      dietaryPreferences: userProfile?.dietaryPreferences || [],
    });
  }, [userProfile?.dietaryPreferences, dietTypeForm]);

  const handleDietTypeSubmit: SubmitHandler<DietTypeFormValues> = (data) => {
    setDietaryPreferences(data.dietaryPreferences);
    toast({
      title: "Diet Type Updated",
      description: "Your dietary preferences have been saved.",
    });
    dietTypeForm.reset(data);
  };

  return (
    <PageWrapper title="Diet Type Settings">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
          <CardDescription>Select your dietary preferences. This can help in future AI suggestions and recipe filtering.</CardDescription>
        </CardHeader>
        <Form {...dietTypeForm}>
          <form onSubmit={dietTypeForm.handleSubmit(handleDietTypeSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={dietTypeForm.control}
                name="dietaryPreferences"
                render={() => (
                  <FormItem>
                    <div className="space-y-2">
                      {AVAILABLE_DIETARY_PREFERENCES.map((preference) => (
                        <FormField
                          key={preference}
                          control={dietTypeForm.control}
                          name="dietaryPreferences"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(preference)}
                                  onCheckedChange={(checked) => {
                                    setTimeout(() => { // Defer state update
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
                                    }, 0);
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={dietTypeForm.formState.isSubmitting || !dietTypeForm.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {dietTypeForm.formState.isSubmitting ? "Saving..." : "Save Dietary Preferences"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </PageWrapper>
  );
}
