
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

  const handleAllergensSubmit: SubmitHandler<AllergensFormValues> = (data) => {
    setAllergens(data.allergens);
    toast({
      title: "Allergens Updated",
      description: "Your allergen filters have been saved.",
    });
    allergensForm.reset(data);
  };

  return (
    <PageWrapper title="Allergen Filters">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Allergens to Avoid</CardTitle>
          <CardDescription>Select any allergens you need to avoid. This can help in filtering recipes and AI suggestions.</CardDescription>
        </CardHeader>
        <Form {...allergensForm}>
          <form onSubmit={allergensForm.handleSubmit(handleAllergensSubmit)}>
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
    </PageWrapper>
  );
}
