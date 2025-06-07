"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AISuggestionForm } from '@/components/ai/AISuggestionForm';
import { suggestMealPlan, type SuggestMealPlanInput, type SuggestMealPlanOutput } from '@/ai/flows/suggest-meal-plan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Note: Adding AI suggested meals to the actual meal plan would require parsing the string output
// and matching to existing recipes or creating new ad-hoc meal entries.
// For this version, we'll display the suggestion. Integration into the meal plan is a future step.

export default function AISuggestionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestMealPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SuggestMealPlanInput) => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await suggestMealPlan(data);
      setSuggestion(result);
    } catch (err) {
      console.error("AI Suggestion Error:", err);
      setError("Failed to get meal suggestion. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper title="AI Meal Planner">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <AISuggestionForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
        <div>
          <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle className="font-headline text-primary flex items-center">
                <Lightbulb className="w-6 h-6 mr-2 text-accent" />
                Your Suggested Meal Plan
              </CardTitle>
              <CardDescription>
                Here's what our AI chef cooked up for you based on your inputs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                  <p>Generating your personalized meal plan...</p>
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {suggestion && !isLoading && (
                <div className="prose prose-sm max-w-none bg-secondary/30 p-4 rounded-md">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><ChefHat className="w-5 h-5 mr-2 text-accent"/>AI's Suggestion:</h4>
                  {/* Basic rendering of the string meal plan. Could be improved with markdown support or structured output from AI. */}
                  {suggestion.mealPlan.split('\n').map((line, index) => (
                    <p key={index} className="my-1">{line}</p>
                  ))}
                  {/* 
                  Future enhancement:
                  <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Add to My Meal Plan
                  </Button> 
                  */}
                </div>
              )}
              {!isLoading && !suggestion && !error && (
                <p className="text-center text-muted-foreground py-10">
                  Fill out the form to get your personalized meal suggestions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
