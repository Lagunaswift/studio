
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { useAppContext } from '@/context/AppContext';
import type { RecipeFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddRecipePage() {
  const { addCustomRecipe } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = (data: RecipeFormData) => {
    try {
      addCustomRecipe(data);
      toast({
        title: "Recipe Added!",
        description: `${data.name} has been added to your recipes.`,
      });
      router.push('/recipes'); // Redirect to recipes list after adding
    } catch (error) {
      console.error("Error adding custom recipe:", error);
      toast({
        title: "Error",
        description: "Could not add your recipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageWrapper title="Add Your Custom Recipe">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
        </Button>
        <RecipeForm onSubmit={handleSubmit} />
    </PageWrapper>
  );
}
