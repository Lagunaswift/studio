
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import type { RecipeFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddRecipePage() {
  const { user } = useAuth();
  const { updateProfile } = useOptimizedProfile(user?.uid);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: RecipeFormData) => {
    try {
        const newRecipe = {
          id: Date.now(),
          ...data,
          user_id: user?.uid,
        };

        // @ts-ignore
        await updateProfile({ recipes: [newRecipe] });

        toast({
            title: "Recipe Added!",
            description: `${data.name} has been added to your recipes.`,
        });
        router.push('/recipes');
    } catch(e: any) {
        toast({
            title: "Error",
            description: e.message || "An unexpected error occurred.",
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
