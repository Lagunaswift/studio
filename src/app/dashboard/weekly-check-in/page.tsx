
"use client";
import { useState, useCallback, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import { ProCoachOutputSchema } from '@/ai/flows/schemas';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { generateTestCoachingData } from '@/lib/tdee/test-data-generator';
import { addOrUpdateWeightLog, addOrUpdateManualMacrosLog } from '@/app/dashboard/profile/actions';

type Recommendation = z.infer<typeof ProCoachOutputSchema>;

export default function WeeklyCheckInPage() {
  const { userProfile, runWeeklyCheckin, setUserInformation } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isTestDataLoading, setIsTestDataLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    recommendation?: Recommendation | null;
  } | null>(null);
  const { toast } = useToast();
  
  const handleRunCheckin = useCallback(async () => {
    setIsLoading(true);
    setCheckInResult(null);
    try {
      const result = await runWeeklyCheckin();
      setCheckInResult(result);
      if (result.success) {
        toast({
          title: "Check-in Complete",
          description: result.message,
        });
      } else {
        toast({
          title: "Check-in Incomplete",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setCheckInResult({
        success: false,
        message: error.message || "An unexpected error occurred."
      });
      toast({
        title: "Check-in Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [runWeeklyCheckin, toast]);

  const handleGenerateTestData = async (goal: 'fatLoss' | 'muscleGain' | 'maintenance') => {
    setIsTestDataLoading(true);
    try {
        if (!userProfile) {
            toast({ title: "Profile not loaded", description: "Please wait for your profile to load before generating data.", variant: "destructive" });
            return;
        }
        const { dailyWeightLog, dailyManualMacrosLog } = generateTestCoachingData(userProfile, goal);
        
        // This is a simplified approach. A more robust solution might use batch writes.
        for (const log of dailyWeightLog) {
            await addOrUpdateWeightLog(log);
        }
        for (const log of dailyManualMacrosLog) {
            await addOrUpdateManualMacrosLog(log);
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
        setIsTestDataLoading(false);
    }
  };

  const canCheckIn = useMemo(() => {
    if (!userProfile) return { can: false, reason: "Your profile is still loading." };
    if (!userProfile.weightKg || !userProfile.tdee) return { can: false, reason: "Please complete your User Info and set your initial Macro Targets." };
    return { can: true, reason: "" };
  }, [userProfile]);

  return (
    <PageWrapper title="Preppy: Weekly Check-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Weekly Review</CardTitle>
            <CardDescription>
              Let Preppy analyze your weight and calorie data from the past few weeks to dynamically adjust your TDEE and macro targets. For best results, log your weight and intake daily.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCheckIn.can ? (
              <Button onClick={handleRunCheckin} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {isLoading ? 'Analyzing Your Progress...' : 'Start My Weekly Check-in'}
              </Button>
            ) : (
              <div className="text-center p-4 bg-muted rounded-md">
                <p className="font-semibold text-destructive">{canCheckIn.reason}</p>
              </div>
            )}
          </CardContent>
           {process.env.NODE_ENV === 'development' && (
              <CardFooter className="flex-col space-y-2 items-start border-t pt-4">
                  <h3 className="font-semibold text-destructive">Dev Tools: Test Data</h3>
                  <p className="text-xs text-muted-foreground">Click to populate your logs with 21 days of sample data to test the check-in feature.</p>
                  <div className="flex gap-2">
                      <Button onClick={() => handleGenerateTestData('fatLoss')} disabled={isTestDataLoading} size="sm" variant="outline">
                         {isTestDataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Fat Loss Data
                      </Button>
                      <Button onClick={() => handleGenerateTestData('muscleGain')} disabled={isTestDataLoading} size="sm" variant="outline">
                         {isTestDataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Muscle Gain Data
                      </Button>
                  </div>
              </CardFooter>
           )}
        </Card>
        
        <Card className={checkInResult ? '' : 'flex items-center justify-center bg-muted/30'}>
            {checkInResult ? (
                 <CardHeader>
                    <CardTitle className={checkInResult.success ? "text-primary" : "text-destructive"}>
                        {checkInResult.success ? "Check-in Analysis Complete" : "Check-in Failed"}
                    </CardTitle>
                    <CardDescription>{checkInResult.message}</CardDescription>
                 </CardHeader>
            ) : (
                <div className="text-center p-8">
                    <p className="text-muted-foreground">Your check-in results will appear here.</p>
                </div>
            )}
            {checkInResult?.recommendation && (
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold">Coaching Summary</h4>
                        <p className="text-sm">{checkInResult.recommendation.coachingSummary}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold">New Macro Targets</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p>Calories: <span className="font-bold">{checkInResult.recommendation.newMacroTargets.calories.toFixed(0)} kcal</span></p>
                            <p>Protein: <span className="font-bold">{checkInResult.recommendation.newMacroTargets.protein.toFixed(0)} g</span></p>
                            <p>Carbs: <span className="font-bold">{checkInResult.recommendation.newMacroTargets.carbs.toFixed(0)} g</span></p>
                            <p>Fat: <span className="font-bold">{checkInResult.recommendation.newMacroTargets.fat.toFixed(0)} g</span></p>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
      </div>
    </PageWrapper>
  );
}
