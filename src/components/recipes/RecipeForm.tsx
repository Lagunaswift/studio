
"use client";

import { useForm, useFieldArray, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { RecipeFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2, Save } from 'lucide-react';

const recipeFormSchema = z.object({
  name: z.string().min(3, { message: "Recipe name must be at least 3 characters." }),
  description: z.string().optional(),
  image: z.string().url({ message: "Please enter a valid URL for the image." }).optional().or(z.literal('')),
  servings: z.coerce.number().min(1, { message: "Servings must be at least 1." }),
  prepTime: z.string().min(1, { message: "Prep time is required." }),
  cookTime: z.string().min(1, { message: "Cook time is required." }),
  chillTime: z.string().optional(),
  ingredients: z.array(z.object({ value: z.string().min(1, { message: "Ingredient cannot be empty." }) })).min(1, { message: "At least one ingredient is required." }),
  instructions: z.array(z.object({ value: z.string().min(1, { message: "Instruction step cannot be empty." }) })).min(1, { message: "At least one instruction step is required." }),
  calories: z.coerce.number().min(0, { message: "Calories must be a non-negative number." }),
  protein: z.coerce.number().min(0, { message: "Protein must be a non-negative number." }),
  carbs: z.coerce.number().min(0, { message: "Carbs must be a non-negative number." }),
  fat: z.coerce.number().min(0, { message: "Fat must be a non-negative number." }),
  tags: z.string().optional(),
});

interface RecipeFormProps {
  onSubmit: SubmitHandler<RecipeFormData>;
  initialData?: Partial<RecipeFormData>; // For future edit functionality
}

export function RecipeForm({ onSubmit, initialData }: RecipeFormProps) {
  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      image: '',
      servings: 1,
      prepTime: '',
      cookTime: '',
      chillTime: '',
      ingredients: [{ value: '' }],
      instructions: [{ value: '' }],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      tags: '',
    },
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control: form.control,
    name: "instructions",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-primary">Recipe Details</CardTitle>
            <CardDescription>Fill in the information for your new recipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Recipe Name</FormLabel>
                <FormControl><Input placeholder="e.g., Grandma's Apple Pie" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="A short description of your recipe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="image" render={({ field }) => (
              <FormItem>
                <FormLabel>Image URL (Optional)</FormLabel>
                <FormControl><Input placeholder="https://example.com/image.jpg or https://placehold.co/..." {...field} /></FormControl>
                <FormDescription>If empty, a placeholder will be used.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="servings" render={({ field }) => (
                <FormItem>
                    <FormLabel>Servings</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="prepTime" render={({ field }) => (
                <FormItem>
                    <FormLabel>Prep Time</FormLabel>
                    <FormControl><Input placeholder="e.g., 15 mins" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="cookTime" render={({ field }) => (
                <FormItem>
                    <FormLabel>Cook Time</FormLabel>
                    <FormControl><Input placeholder="e.g., 30 mins" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>
            <FormField control={form.control} name="chillTime" render={({ field }) => (
              <FormItem>
                <FormLabel>Chill/Rest Time (Optional)</FormLabel>
                <FormControl><Input placeholder="e.g., 1 hr" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-primary">Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ingredientFields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`ingredients.${index}.value`}
                render={({ field: itemField }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl><Input placeholder="e.g., 1 cup flour, 2 large eggs" {...itemField} /></FormControl>
                      {ingredientFields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeIngredient(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="button" variant="outline" onClick={() => appendIngredient({ value: '' })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-primary">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructionFields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`instructions.${index}.value`}
                render={({ field: itemField }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                        <FormLabel className="text-sm text-muted-foreground pt-2 min-w-[50px]">Step {index + 1}</FormLabel>
                      <FormControl><Textarea placeholder="Describe this step..." {...itemField} /></FormControl>
                      {instructionFields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeInstruction(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="button" variant="outline" onClick={() => appendInstruction({ value: '' })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Instruction Step
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-primary">Macros Per Serving</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={form.control} name="calories" render={({ field }) => (
              <FormItem>
                <FormLabel>Calories (kcal)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 350" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="protein" render={({ field }) => (
              <FormItem>
                <FormLabel>Protein (g)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 20" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="carbs" render={({ field }) => (
              <FormItem>
                <FormLabel>Carbs (g)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 45" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fat" render={({ field }) => (
              <FormItem>
                <FormLabel>Fat (g)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 15" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-primary">Tags (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>Recipe Tags</FormLabel>
                <FormControl><Input placeholder="e.g., V, GF, Quick, HP" {...field} /></FormControl>
                <FormDescription>Comma-separated values (e.g., Vegetarian, Gluten-Free, Quick Meal).</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
            <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? "Saving Recipe..." : "Save Recipe"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
