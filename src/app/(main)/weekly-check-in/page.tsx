
"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, CheckSquare, Info, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function WeeklyCheckinPage() {
  const { userProfile, runWeeklyCheckin, setMacroTargets, isAppDataLoading } = useAppContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<PreppyOutput | null>(null);

  const handleRunCheckin = async () => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const result = await runWeeklyCheckin();
      if (result.success && result.recommendation) {
        setRecommendation(result.recommendation);
      } else {
        setError(result.message || "An unknown error occurred during the check-in.");
      }
    } catch (e: any) {
      console.error("Weekly Check-in Error:", e);
      setError(e.message || "A critical error occurred. Please check the console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTargets = async () => {
    if (!recommendation?.newMacroTargets) return;
    await setMacroTargets(recommendation.newMacroTargets);
    setError("New targets have been applied! You're all set for the week ahead.");
    setRecommendation(null); // Clear the recommendation to prevent re-applying
  };

  const isCheckinDisabled = !userProfile?.dailyWeightLog || userProfile.dailyWeightLog.length < 14;

  if (isAppDataLoading) {
     return (
      <PageWrapper title="Preppy: Weekly Check-in">
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
          <p className="text-lg">Loading your data...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Preppy: Weekly Check-in">
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <CheckSquare className="w-6 h-6 mr-2 text-accent" />
              Your Weekly Check-in with Preppy
            </CardTitle>
            <CardDescription>
              This is where my AI coaching shines. Based on your logged weight and food intake, I'll calculate your true energy expenditure (TDEE) and adjust your targets to keep you perfectly on track.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isCheckinDisabled ? (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>More Data Needed</AlertTitle>
                    <AlertDescription>
                        The weekly check-in requires at least 14 days of logged weight and consumed meals to accurately calculate your TDEE. Keep logging your progress daily on the <Link href="/" className="underline">Dashboard</Link> and <Link href="/meal-plan" className="underline">Meal Plan</Link> pages!
                    </AlertDescription>
                </Alert>
            ) : (
                <Button onClick={handleRunCheckin} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Start My Check-in
                </Button>
            )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
            <p className="text-lg">Analyzing your progress...</p>
            <p className="text-sm">This might take a moment.</p>
          </div>
        )}

        {error && !recommendation && (
          <Alert variant={error.includes("applied") ? "default" : "destructive"} className={error.includes("applied") ? "border-green-500" : ""}>
            <Info className="h-4 w-4" />
            <AlertTitle>{error.includes("applied") ? "Success" : "Check-in Error"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {recommendation && !isLoading && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Your Weekly Check-in Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-1 text-primary-focus flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-accent" /> My Coaching Summary
                    </h3>
                    <p className="text-sm text-foreground/80 bg-secondary/30 p-3 rounded-md whitespace-pre-wrap">{recommendation.coachingSummary}</p>
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-xl font-semibold font-headline text-primary-focus mb-2">New Recommended Targets:</h3>
                    {recommendation.newMacroTargets ? (
                         <MacroDisplay macros={recommendation.newMacroTargets} title="" highlightTotal className="shadow-md" />
                    ) : <p>No new targets were recommended.</p>}
                   
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleApplyTargets} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <CheckSquare className="mr-2 h-5 w-5" /> Accept & Start New Week
                </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
