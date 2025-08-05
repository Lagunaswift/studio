
"use client";

import { useState, useCallback, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext'; // Add this import
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, CheckSquare, Info, AlertTriangle, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { ProCoachOutputSchema } from '@/ai/flows/schemas';
import { z } from 'zod';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ProFeature } from '@/components/shared/ProFeature';
import { useToast } from '@/hooks/use-toast';
import { generateTestCoachingData } from '@/lib/tdee/test-data-generator';
import { addOrUpdateWeightLog, addOrUpdateManualMacrosLog } from '@/app/dashboard/profile/actions';

type Recommendation = z.infer<typeof ProCoachOutputSchema>;


export default function WeeklyCheckinPage() {
  const { userProfile, runWeeklyCheckin, setMacroTargets, isAppDataLoading, isSubscribed, dailyWeightLog } = useAppContext();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

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
    } catch (e: any)      {
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
    setRecommendation(null);
  };

  const isCheckinDisabled = !dailyWeightLog || dailyWeightLog.length < 14;

  const isStillLoading = isAuthLoading || isAppDataLoading || !user || !userProfile;
  
  const handleGenerateTestData = async (goal: 'fatLoss' | 'muscleGain' | 'maintenance') => {
    setIsLoading(true);
    try {
        if (!userProfile) {
            toast({ title: "Profile not loaded", description: "Please wait for your profile to load before generating data.", variant: "destructive" });
            return;
        }
        const { dailyWeightLog, dailyManualMacrosLog } = generateTestCoachingData(userProfile, goal);
        
        // This is a simplified approach. A more robust solution might use batch writes.
        for (const log of dailyWeightLog) {
            await callServerActionWithAuth(addOrUpdateWeightLog, log);
        }
        for (const log of dailyManualMacrosLog) {
            await callServerActionWithAuth(addOrUpdateManualMacrosLog, log);
        }

        toast({
            title: "Test Data Generated",
            description: `Generated 21 days of mock data for a ${goal} scenario.`,
        });
    } catch (error: any) {
        toast({
            title: "Failed to Generate Test Data",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };


  if (!isSubscribed) {
    return (
        <PageWrapper title="Preppy: Weekly Check-in">
            <ProFeature featureName="Weekly Check-in" description="This is the core of our adaptive coaching. Preppy analyzes your weight trend and calorie intake to calculate your true energy expenditure, then provides optimized macro targets to ensure you stay on track with your goals." />
        </PageWrapper>
    );
  }

  if (isStillLoading) {
     return (
      <PageWrapper title="Preppy: Weekly Check-in">
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin text-accent mb-6" />
          <p className="text-lg">
            {isAuthLoading ? "Authenticating..." : 
             isAppDataLoading ? "Loading your data..." : 
             !user ? "Waiting for authentication..." :
             !userProfile ? "Loading your profile..." : 
             "Loading..."}
          </p>
        </div>
      </PageWrapper>
    );
  }
  
  if (!userProfile) {
    return (
      <PageWrapper title="Preppy: Weekly Check-in">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Profile Not Found</AlertTitle>
          <AlertDescription>
            Your profile data could not be loaded. Please try refreshing the page or check your <Link href="/dashboard/profile/user-info" className="underline">Profile Settings</Link>.
          </AlertDescription>
        </Alert>
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
              Your Weekly Review
            </CardTitle>
            <CardDescription>
              Let Preppy analyze your weight and calorie data from the past few weeks to dynamically adjust your TDEE and macro targets. For best results, log your weight and intake daily.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isCheckinDisabled ? (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>More Data Needed</AlertTitle>
                    <AlertDescription>
                        The weekly check-in requires at least 14 days of logged weight and consumed meals to accurately calculate your TDEE. Keep logging your progress daily on the <Link href="/dashboard" className="underline">Dashboard</Link> and <Link href="/dashboard/meal-plan" className="underline">Meal Plan</Link> pages!
                    </AlertDescription>
                </Alert>
            ) : (
                <Button onClick={handleRunCheckin} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing your data...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Run Weekly Check-in
                        </>
                    )}
                </Button>
            )}
          </CardContent>
        </Card>

        {process.env.NODE_ENV === 'development' && (
            <Card className="border-dashed border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
                <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Dev Tools: Test Data
                </CardTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-300">
                Click to populate your logs with 21 days of sample data to test the check-in feature.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button 
                variant="outline" 
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 dark:text-yellow-200 dark:hover:bg-yellow-900/20"
                onClick={() => handleGenerateTestData('fatLoss')}
                >
                Generate Test Data
                </Button>
            </CardContent>
            </Card>
        )}

        {error && (
          <Alert variant={error.includes("applied") ? "default" : "destructive"}>
            <Info className="h-4 w-4" />
            <AlertTitle>{error.includes("applied") ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {recommendation && (
          <Card className="shadow-lg border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Preppy's Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold mb-2">New Macro Targets:</h4>
                <MacroDisplay macros={recommendation.newMacroTargets} />
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Coaching Summary:</h4>
                <p className="text-muted-foreground">{recommendation.coachingSummary}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleApplyTargets} className="w-full bg-green-600 hover:bg-green-700">
                Accept & Apply New Targets
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
