
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import type { PantryItem, UKSupermarketCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, MinusCircle, Trash2, Archive, CheckCircle, XCircle } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const UK_SUPERMARKET_CATEGORIES: UKSupermarketCategory[] = [
  "Fresh Fruit & Vegetables", "Bakery", "Meat & Poultry", "Fish & Seafood", 
  "Dairy, Butter & Eggs", "Chilled Foods", "Frozen Foods", "Food Cupboard", "Drinks", "Other Food Items"
];

const COMMON_UNITS: string[] = [
  "item(s)", "g", "kg", "ml", "L", "tsp", "tbsp", "cup", "oz", "lb", "slice(s)", "can(s)"
];

const pantryItemSchema = z.object({
  name: z.string().min(1, "Ingredient name is required."),
  quantity: z.coerce.number().positive({ message: "Quantity must be a positive number." }),
  unit: z.string().min(1, "Unit is required."),
  category: z.enum(UK_SUPERMARKET_CATEGORIES),
});

type PantryItemFormValues = z.infer<typeof pantryItemSchema>;

export default function PantryPage() {
  const { pantryItems, addPantryItem, removePantryItem, updatePantryItemQuantity, assignIngredientCategory } = useAppContext();
  const { toast } = useToast();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number>(0);

  const form = useForm<PantryItemFormValues>({
    resolver: zodResolver(pantryItemSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      unit: 'item(s)',
      category: 'Food Cupboard',
    },
  });

  const onSubmit: SubmitHandler<PantryItemFormValues> = (data) => {
    try {
      // Use the explicit category from the form, or try to assign one if needed (though category is required by schema)
      const category = data.category || assignIngredientCategory(data.name);
      addPantryItem(data.name, data.quantity, data.unit, category);
      toast({
        title: "Item Added",
        description: `${data.quantity} ${data.unit} of ${data.name} added to your pantry.`,
      });
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error Adding Item",
        description: error.message || "Could not add item to pantry.",
        variant: "destructive",
      });
      console.error("Error adding item:", error);
    }
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = pantryItems.find(p => p.id === itemId);
    if (item) {
      const newQuantity = Math.max(0, item.quantity + delta);
       if (newQuantity === 0) {
        removePantryItem(itemId);
         toast({ title: "Item Removed", description: `${item.name} removed from pantry as quantity reached zero.` });
      } else {
        updatePantryItemQuantity(itemId, newQuantity);
      }
    }
  };

  const handleDirectQuantityUpdate = (itemId: string, newQuantityStr: string) => {
    const newQuantity = parseFloat(newQuantityStr);
    if (!isNaN(newQuantity)) {
      setEditingQuantity(newQuantity); // Keep local state for input field
    }
  };

  const saveEditedQuantity = (itemId: string) => {
    const item = pantryItems.find(p => p.id === itemId);
    if (item) {
      if (editingQuantity <= 0) {
        removePantryItem(itemId);
        toast({ title: "Item Removed", description: `${item.name} removed as quantity set to zero or less.` });
      } else {
        updatePantryItemQuantity(itemId, editingQuantity);
        toast({ title: "Quantity Updated", description: `Quantity for ${item.name} updated.` });
      }
    }
    setEditingItemId(null);
  };

  const startEditing = (item: PantryItem) => {
    setEditingItemId(item.id);
    setEditingQuantity(item.quantity);
  };


  const groupedPantryItems: { [category: string]: PantryItem[] } = pantryItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as { [category: string]: PantryItem[] });

  const sortedCategories = Object.keys(groupedPantryItems).sort();

  return (
    <PageWrapper title="Manage Your Pantry">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-primary flex items-center">
                <PlusCircle className="w-6 h-6 mr-2 text-accent" />
                Add Item to Pantry
              </CardTitle>
              <CardDescription>
                Enter ingredient details to add them to your pantry.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ingredient Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Chicken Breast, Dates" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 2" {...field} step="0.01" min="0.01"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COMMON_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UK_SUPERMARKET_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    Add to Pantry
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-primary flex items-center">
                <Archive className="w-6 h-6 mr-2 text-accent" />
                Your Pantry Items
              </CardTitle>
              <CardDescription>
                View and manage the ingredients currently in your pantry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pantryItems.length === 0 ? (
                <Alert>
                  <Archive className="h-4 w-4" />
                  <AlertTitle>Your Pantry is Empty</AlertTitle>
                  <AlertDescription>
                    Add items using the form to start tracking your pantry inventory.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {sortedCategories.map((category) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-primary mb-2 capitalize border-b border-border pb-1">
                        {category} ({groupedPantryItems[category].length})
                      </h3>
                      <ul className="space-y-2">
                        {groupedPantryItems[category].map((item) => (
                          <li key={item.id} className="flex items-center justify-between p-3 rounded-md bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex-grow">
                              <span className="font-medium">{item.name}</span>
                              {editingItemId === item.id ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    type="number"
                                    value={editingQuantity}
                                    onChange={(e) => handleDirectQuantityUpdate(item.id, e.target.value)}
                                    className="h-8 w-20 text-sm"
                                    step="0.01"
                                    min="0"
                                  />
                                  <span className="text-sm text-muted-foreground">{item.unit}</span>
                                  <Button size="icon" variant="ghost" onClick={() => saveEditedQuantity(item.id)} className="h-7 w-7">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => setEditingItemId(null)} className="h-7 w-7">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground cursor-pointer" onClick={() => startEditing(item)}>
                                  {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {item.unit}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(item.id, 1)} className="h-7 w-7">
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(item.id, -1)} className="h-7 w-7">
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => removePantryItem(item.id)} className="h-7 w-7 text-destructive hover:text-destructive/80">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                       {sortedCategories.indexOf(category) < sortedCategories.length -1 && <Separator className="my-4"/>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
