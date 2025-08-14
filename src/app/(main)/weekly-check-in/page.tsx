
"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, CheckSquare, Info, AlertTriangle, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { WeeklyAnalysisLoading } from '@/components/ui/enhanced-preppy-loading';
import { InfoMessage } from '@/components/ui/friendly-error';
import type { PreppyOutput } from '@/ai/flows/pro-coach-flow';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ProFeature } from '@/components/shared/ProFeature';
import { WeeklyCheckinChat } from '@/components/ai-coach/WeeklyCheckinChat';
import { useWeeklyAnalysisChat } from '@/hooks/useWeeklyAnalysisChat';

export default function WeeklyCheckinPage() {
  const { user } = useAuth();
  const { profile: userProfile, updateProfile, loading: isAppDataLoading } = useOptimizedProfile(user?.uid);
  const { state: chatState, startConversation, endConversation } = useWeeklyAnalysisChat();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<PreppyOutput | null>(null);

  const handleRunCheckin = async () => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      // Enhanced simulation for demo with realistic analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful weekly analysis
      const mockAnalysis: PreppyOutput = {
        newMacroTargets: {
          calories: 1820,
          protein: 140,
          carbs: 180,
          fat: 65,
        },
        coachingSummary: "Excellent week! You maintained consistent logging and your energy levels have been strong. Your actual TDEE is tracking higher than estimated, which means your metabolism is responding well to the current approach. I'm making a small adjustment to optimize your progress rate while keeping you energized."
      };

      setRecommendation(mockAnalysis);
      // Start conversational mode
      startConversation(mockAnalysis);

      // For production, this would be:
      // const result = await runWeeklyCheckin();
      // if (result.success && result.recommendation) {
      //   setRecommendation(result.recommendation);
      //   startConversation(result.recommendation);
      // } else {
      //   setError(result.message || "An unknown error occurred during the check-in.");
      // }
    } catch (e: any) {
      console.error("Weekly Check-in Error:", e);
      setError(e.message || "A critical error occurred. Please check the console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTargets = async () => {
    if (!recommendation?.newMacroTargets) return;
    await updateProfile({ macroTargets: recommendation.newMacroTargets });
    setError("New targets have been applied! You're all set for the week ahead.");
    setRecommendation(null); // Clear the recommendation to prevent re-applying
    endConversation(); // End conversation mode
  };

  const handleEndConversation = () => {
    endConversation();
    setRecommendation(null);
  };
  // @ts-ignore
  const isCheckinDisabled = !userProfile?.dailyWeightLog || userProfile.dailyWeightLog.length < 14;

  if (!userProfile?.subscription_status || userProfile.subscription_status !== 'active') {
    return (
        <PageWrapper title="Preppy: Weekly Check-in">
            <ProFeature featureName="Weekly Check-in" description="This is the core of our adaptive coaching. Preppy analyzes your weight trend and calorie intake to calculate your true energy expenditure, then provides optimized macro targets to ensure you stay on track with your goals." />
        </PageWrapper>
    );
  }

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
                <InfoMessage
                    title="More Data Needed"
                    description="The weekly check-in requires at least 14 days of logged weight and consumed meals to accurately calculate your TDEE. Keep logging your progress daily and come back!"
                    actionText="Go to Dashboard"
                    onAction={() => window.location.href = '/'}
                />
            ) : (
                <Button onClick={handleRunCheckin} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Start My Check-in
                </Button>
            )}
          </CardContent>
        </Card>
        {isLoading && (
          <WeeklyAnalysisLoading 
            duration={12000}
            userContext={{
              currentGoal: userProfile?.primaryGoal as any,
              hasLowEnergy: false,
              timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
              moodToday: 'motivated',
              fitnessLevel: 'intermediate'
            }}
            showProgress
            className="h-60"
          />
        )}

        {error && !recommendation && (
          <Alert variant={error.includes("applied") ? "default" : "destructive"} className={error.includes("applied") ? "border-green-500" : ""}>
            <Info className="h-4 w-4" />
            <AlertTitle>{error.includes("applied") ? "Success" : "Check-in Error"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Conversational Mode - Whoop-style AI Coach */}
        {chatState.isConversationMode && recommendation && !isLoading && (
          <WeeklyCheckinChat
            analysisResult={recommendation}
            onAcceptTargets={handleApplyTargets}
            onClose={handleEndConversation}
          />
        )}

        {/* Legacy Static Mode - fallback if conversation fails */}
        {recommendation && !isLoading && !chatState.isConversationMode && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-primary">Your Weekly Check-in Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-1 text-primary-focus flex items-center">
                        <Wand2 className="w-5 h-5 mr-2 text-accent" /> My Coaching Summary
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
