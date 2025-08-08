"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2 } from 'lucide-react';


const formSchema = z.object({
  dietaryGoals: z.string().min(10, { message: "Please describe your dietary goals in at least 10 characters." }),
  preferences: z.string().min(10, { message: "Please describe your preferences/allergies in at least 10 characters." }),
});

type AISuggestionFormValues = z.infer<typeof formSchema>;

interface AISuggestionFormProps {
  onSubmit: (data: any) => Promise<any | null>;
  isLoading: boolean;
}

export default function AISuggestionForm({ onSubmit, isLoading }: AISuggestionFormProps) {
  const form = useForm<AISuggestionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dietaryGoals: "",
      preferences: "",
    },
  });

  const handleSubmit: SubmitHandler<AISuggestionFormValues> = async (data) => {
    await onSubmit(data);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-primary flex items-center">
          <Wand2 className="w-6 h-6 mr-2 text-accent" />
          Get AI Meal Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dietaryGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Goals</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weight loss, muscle gain, general health" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferences & Allergies</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Vegetarian, no nuts, love spicy food, dislike cilantro"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Suggest Meal Plan
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
