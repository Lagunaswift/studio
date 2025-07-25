"use client";
import { PageWrapper } from '@/components/layout/PageWrapper';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function AddRecipePage() {
    const { addCustomRecipe } = useAppContext();
    const { toast } = useToast();
    const router = useRouter();
    const handleSubmit = async (data) => {
        try {
            const result = await addCustomRecipe(data);
            if (result?.error) {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
            else {
                toast({
                    title: "Recipe Added!",
                    description: `${data.name} has been added to your recipes.`,
                });
                router.push('/recipes');
            }
        }
        catch (e) {
            toast({
                title: "Error",
                description: e.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };
    return (<PageWrapper title="Add Your Custom Recipe">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4"/> Back to Recipes
        </Button>
        <RecipeForm onSubmit={handleSubmit}/>
    </PageWrapper>);
}
