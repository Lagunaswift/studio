
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import type { RecipeFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addRecipe } from '../actions'; // Import the new server action

export default function AddRecipePage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: RecipeFormData) => {
    const result = await addRecipe(data);

    if (result?.error) {
        toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
        });
    } else {
        toast({
            title: "Recipe Added!",
            description: `${data.name} has been added to your recipes.`,
        });
        // The server action now handles the redirect, but we could also do it here if needed.
        // router.push('/recipes');
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
