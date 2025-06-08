
"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import { ShoppingListItemComponent } from '@/components/shopping/ShoppingListItemComponent';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ShoppingCart, Trash2, Settings2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ShoppingListPage() {
  const { shoppingList, toggleShoppingListItem, clearAllData } = useAppContext();
  const { toast } = useToast();
  const [isStoreFriendlyMode, setIsStoreFriendlyMode] = useState(false);

  const handleClearList = () => {
    clearAllData(); 
    toast({
      title: "Shopping List Cleared",
      description: "Your shopping list and meal plan have been cleared.",
    });
  };

  const groupedList: { [category: string]: typeof shoppingList } = shoppingList.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as { [category: string]: typeof shoppingList });

  const categories = Object.keys(groupedList).sort();

  const purchasedCount = shoppingList.filter(item => item.purchased).length;
  const totalCount = shoppingList.length;

  return (
    <PageWrapper title="Your Shopping List">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="font-headline text-primary flex items-center">
              <ShoppingCart className="w-6 h-6 mr-2 text-accent" />
              Grocery Items
            </CardTitle>
            <CardDescription>
              {totalCount > 0 ? `You have ${totalCount - purchasedCount} item(s) left to buy.` : "Your shopping list is currently empty. Add meals to your plan to generate a list."}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 sm:mt-0">
            <div className="flex items-center space-x-2">
              <Switch
                id="store-friendly-mode"
                checked={isStoreFriendlyMode}
                onCheckedChange={setIsStoreFriendlyMode}
              />
              <Label htmlFor="store-friendly-mode" className="text-sm text-muted-foreground flex items-center">
                <Settings2 className="w-4 h-4 mr-1 text-accent/80" /> Store-Friendly Quantities
              </Label>
            </div>
            {totalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear List & Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will clear your entire shopping list and meal plan. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearList} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                      Confirm Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {totalCount === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 text-primary/50 mb-4" />
                <p>No items in your shopping list.</p>
                <p>Add some recipes to your meal plan to get started!</p>
             </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-primary mb-2 capitalize border-b border-border pb-1">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {groupedList[category].map((item) => (
                      <ShoppingListItemComponent
                        key={item.id}
                        item={item}
                        onToggle={toggleShoppingListItem}
                        isStoreFriendlyMode={isStoreFriendlyMode}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {totalCount > 0 && (
          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {purchasedCount} of {totalCount} items purchased.
            </p>
          </CardFooter>
        )}
      </Card>
    </PageWrapper>
  );
}
