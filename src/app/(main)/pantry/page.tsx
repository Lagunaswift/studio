

"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import type { PantryItem, UKSupermarketCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle, MinusCircle, Trash2, Archive, CheckCircle, XCircle, CalendarIcon, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, addDays, isBefore, isSameDay, parseISO, isValid, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { UK_SUPERMARKET_CATEGORIES } from '@/types';

const COMMON_UNITS: string[] = [
  "item(s)", "g", "kg", "ml", "L", "tsp", "tbsp", "cup", "oz", "lb", "slice(s)", "can(s)", "egg"
];

const pantryItemSchema = z.object({
  name: z.string().min(1, "Ingredient name is required."),
  quantity: z.coerce.number().positive({ message: "Quantity must be a positive number." }),
  unit: z.string().min(1, "Unit is required."),
  category: z.enum(UK_SUPERMARKET_CATEGORIES),
  expiryDate: z.string().optional(), // YYYY-MM-DD format, optional
});

type PantryItemFormValues = z.infer<typeof pantryItemSchema>;

export default function PantryPage() {
  const { user } = useAuth();
  const { profile: userProfile, updateProfile, loading: isAppDataLoading } = useOptimizedProfile(user?.uid);
  const { toast } = useToast();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<number>(0);
  const [selectedExpiryDate, setSelectedExpiryDate] = useState<Date | undefined>(undefined);

  const [expiredItems, setExpiredItems] = useState<PantryItem[]>([]);
  const [expiringSoonItems, setExpiringSoonItems] = useState<PantryItem[]>([]);

  const pantryItems = (userProfile?.pantryItems as PantryItem[]) || [];

  const form = useForm<PantryItemFormValues>({
    resolver: zodResolver(pantryItemSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      unit: 'item(s)',
      category: 'Food Cupboard',
      expiryDate: undefined,
    },
  });

  useEffect(() => {
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);

    const expired: PantryItem[] = [];
    const expiringSoon: PantryItem[] = [];

    pantryItems.forEach(item => {
      if (item.expiryDate) {
        try {
          const expiry = parseISO(item.expiryDate); // Converts YYYY-MM-DD string to Date
          if (isValid(expiry)) {
            if (isBefore(expiry, today)) {
              expired.push(item);
            } else if (isBefore(expiry, sevenDaysFromNow) || isSameDay(expiry, today)) {
              expiringSoon.push(item);
            }
          }
        } catch (e) {
          console.error("Error parsing expiry date for item:", item.name, item.expiryDate, e);
        }
      }
    });
    setExpiredItems(expired.sort((a,b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()));
    setExpiringSoonItems(expiringSoon.sort((a,b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()));
  }, [pantryItems]);

  const onSubmit: SubmitHandler<PantryItemFormValues> = (data) => {
    try {
      const category = data.category || 'Food Cupboard';
      const newItem = {
        id: `${Date.now()}`,
        ...data,
        category,
      }
      updateProfile({ pantryItems: [...pantryItems, newItem] as any });
      toast({
        title: "Item Added",
        description: `${data.quantity} ${data.unit} of ${data.name} added to your pantry.`,
      });
      form.reset({
        name: '',
        quantity: 1,
        unit: 'item(s)',
        category: 'Food Cupboard',
        expiryDate: undefined,
      });
      setSelectedExpiryDate(undefined); // Reset date picker display
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

  const updatePantryItemQuantity = (itemId: string, newQuantity: number) => {
    const updatedPantry = pantryItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
    updateProfile({ pantryItems: updatedPantry as any });
  }

  const removePantryItem = (itemId: string) => {
    const updatedPantry = pantryItems.filter(item => item.id !== itemId);
    updateProfile({ pantryItems: updatedPantry as any });
  }

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

  if (isAppDataLoading) {
    return (
        <PageWrapper title="Manage Your Pantry">
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            </div>
        </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Manage Your Pantry">
      {(expiredItems.length > 0 || expiringSoonItems.length > 0) && (
        <div className="mb-8 space-y-4">
          {expiredItems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Expired Items!</AlertTitle>
              <AlertDescription>
                The following items in your pantry have expired:
                <ul className="list-disc pl-5 mt-2">
                  {expiredItems.map(item => (
                    <li key={`expired-${item.id}`}>
                      {item.name} (Expired on: {item.expiryDate ? format(parseISO(item.expiryDate), 'dd MMMM yyyy') : 'N/A'})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {expiringSoonItems.length > 0 && (
            <Alert variant="default" className="border-orange-500 text-orange-700 dark:text-orange-400 dark:border-orange-600 [&>svg]:text-orange-500 dark:[&>svg]:text-orange-400">
              <Info className="h-5 w-5" />
              <AlertTitle>Items Expiring Soon</AlertTitle>
              <AlertDescription>
                The following items are expiring within the next 7 days or are expired today:
                <ul className="list-disc pl-5 mt-2">
                  {expiringSoonItems.map(item => (
                    <li key={`expiring-${item.id}`} className={cn(item.expiryDate && isBefore(parseISO(item.expiryDate), new Date()) && !isSameDay(parseISO(item.expiryDate), new Date()) ? "text-red-600 dark:text-red-400 font-semibold" : "")}>
                      {item.name} (Expires on: {item.expiryDate ? format(parseISO(item.expiryDate), 'dd MMMM yyyy') : 'N/A'})
                       {item.expiryDate && isBefore(parseISO(item.expiryDate), new Date()) && !isSameDay(parseISO(item.expiryDate), new Date()) && " - Already Expired!"}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {selectedExpiryDate ? (
                                  format(selectedExpiryDate, "dd MMMM yyyy")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedExpiryDate}
                              onSelect={(date) => {
                                setSelectedExpiryDate(date as Date);
                                field.onChange(date ? format(date, "yyyy-MM-dd") : undefined);
                              }}
                              disabled={(date) => date < startOfDay(new Date()) }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                              </div>
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
                              {item.expiryDate && (
                                <p className={cn(
                                  "text-xs",
                                  isValid(parseISO(item.expiryDate)) && isBefore(parseISO(item.expiryDate), startOfDay(new Date())) ? "text-destructive font-semibold" : "text-muted-foreground"
                                )}>
                                  Expires: {format(parseISO(item.expiryDate), 'dd MMMM yyyy')}
                                  {isValid(parseISO(item.expiryDate)) && isBefore(parseISO(item.expiryDate), startOfDay(new Date())) && " (EXPIRED)"}
                                </p>
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
