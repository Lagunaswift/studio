
"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { MealSlotConfig, MealType } from '@/types';
import { MEAL_TYPES } from '@/lib/data'; // Ensure MEAL_TYPES is exported from data.ts
import { PlusCircle, Trash2, Save } from 'lucide-react';

export default function MealStructurePage() {
  const { userProfile, setMealStructure: setContextMealStructure } = useAppContext();
  const { toast } = useToast();

  const [editableMealStructure, setEditableMealStructure] = useState<MealSlotConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (userProfile?.mealStructure) {
      // Deep copy to avoid direct mutation
      setEditableMealStructure(JSON.parse(JSON.stringify(userProfile.mealStructure)));
    }
  }, [userProfile?.mealStructure]);

  const handleAddMealSlot = () => {
    const newSlot: MealSlotConfig = {
      id: `new-${Date.now()}`, // Simple unique ID
      name: 'New Meal',
      type: 'Snack', // Default to snack
    };
    setEditableMealStructure(prev => [...prev, newSlot]);
    setIsDirty(true);
  };

  const handleDeleteMealSlot = (id: string) => {
    setEditableMealStructure(prev => prev.filter(slot => slot.id !== id));
    setIsDirty(true);
  };

  const handleNameChange = (id: string, newName: string) => {
    setEditableMealStructure(prev => 
      prev.map(slot => slot.id === id ? { ...slot, name: newName } : slot)
    );
    setIsDirty(true);
  };

  const handleTypeChange = (id: string, newType: MealType) => {
    setEditableMealStructure(prev =>
      prev.map(slot => slot.id === id ? { ...slot, type: newType } : slot)
    );
    setIsDirty(true);
  };

  const handleSaveChanges = () => {
    if (!editableMealStructure.every(slot => slot.name.trim() !== "")) {
      toast({
        title: "Validation Error",
        description: "All meal slot names must be filled.",
        variant: "destructive",
      });
      return;
    }
    setContextMealStructure(editableMealStructure);
    toast({
      title: "Meal Structure Saved",
      description: "Your meal structure has been updated.",
    });
    setIsDirty(false);
  };
  
  if (!userProfile) {
     return (
      <PageWrapper title="Meal Structure">
        <p>Loading user profile...</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Customize Your Meal Structure">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Define Meal Slots</CardTitle>
          <CardDescription>
            Set up your daily meal structure. The "Slot Name" is your custom label (e.g., "Post-Workout Meal"), while the "Base Meal Type" tells the AI what kind of meal to suggest (e.g., a light snack or a full dinner).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {editableMealStructure.map((slot, index) => (
            <Card key={slot.id} className="p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-grow space-y-3">
                  <div>
                    <label htmlFor={`slot-name-${slot.id}`} className="block text-sm font-medium text-foreground/80 mb-1">
                      Slot Name
                    </label>
                    <Input
                      id={`slot-name-${slot.id}`}
                      value={slot.name}
                      onChange={(e) => handleNameChange(slot.id, e.target.value)}
                      placeholder="e.g., Breakfast, Lunch, Snack 1"
                    />
                  </div>
                  <div>
                    <label htmlFor={`slot-type-${slot.id}`} className="block text-sm font-medium text-foreground/80 mb-1">
                      Base Meal Type
                    </label>
                    <Select
                      value={slot.type}
                      onValueChange={(value: MealType) => handleTypeChange(slot.id, value)}
                    >
                      <SelectTrigger id={`slot-type-${slot.id}`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <p className="text-[0.8rem] text-muted-foreground pt-2">
                        Helps the AI choose appropriate recipes for this slot.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => handleDeleteMealSlot(slot.id)}
                  className="mt-2 sm:mt-0 sm:ml-auto self-start sm:self-center shrink-0"
                  aria-label="Delete meal slot"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          <Button variant="outline" onClick={handleAddMealSlot} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Meal Slot
          </Button>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveChanges} 
            disabled={!isDirty || editableMealStructure.length === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Save className="mr-2 h-4 w-4" /> Save Meal Structure
          </Button>
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}
