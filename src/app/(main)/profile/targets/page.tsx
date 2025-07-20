

"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { MacroTargets, TrainingExperienceLevel } from '@/types';
import { useEffect, useState, useMemo } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { suggestProteinIntake, type SuggestProteinIntakeInput, type SuggestProteinIntakeOutput } from '@/ai/flows/suggest-protein-intake-flow';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, Info, Lightbulb, Droplets, AlertTriangle, HelpCircle, Calculator } from "lucide-react";
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive").default(0),
  protein: z.coerce.number().min(0, "Protein must be positive").default(0),
  carbs: z.coerce.number().min(0, "Carbs must be positive").default(0),
  fat: z.coerce.number().min(0, "Fat must be positive").default(0),
});

type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;

interface FatSuggestion {
  suggestedFatGrams: number;
  justification: string;
}

const getMonthlyGainKg = (sex: 'male' | 'female' | null, level: TrainingExperienceLevel | null): number => {
    if (!sex || !level || level === 'notSpecified') return 0;
    
    if (sex === 'female') {
        switch(level) {
            case 'beginner': return 0.75;
            case 'intermediate': return 0.55;
            case 'advanced': return 0.325;
            case 'veryAdvanced': return 0.175;
            default: return 0;
        }
    } else { // male
        switch(level) {
            case 'beginner': return 1.5;
            case 'intermediate': return 1.0;
            case 'advanced': return 0.65;
            case 'veryAdvanced': return 0.4;
            default: return 0;
        }
    }
};

export default function DietaryTargetsPage() {
  const { userProfile, setMacroTargets, setUserInformation } = useAppContext();
  const { toast } = useToast();
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [proteinSuggestion, setProteinSuggestion] = useState<SuggestProteinIntakeOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [fatSuggestion, setFatSuggestion] = useState<FatSuggestion | null>(null);
  const [fatSuggestionError, setFatSuggestionError] = useState<string | null>(null);

  const [weightLossWarning, setWeightLossWarning] = useState<string | null>(null);
  const [energyAvailabilityWarning, setEnergyAvailabilityWarning] = useState<string | null>(null);
  
  const [lossPercentage, setLossPercentage] = useState<number>(0.75);


  const macroForm = useForm<MacroTargetFormValues>({
    resolver: zodResolver(macroTargetSchema),
    defaultValues: userProfile?.macroTargets || { calories: 0, protein: 150, carbs: 200, fat: 60 },
  });

  useEffect(() => {
    if (userProfile?.macroTargets) {
      macroForm.reset(userProfile.macroTargets);
    } else {
       macroForm.reset({ calories: 0, protein: 150, carbs: 200, fat: 60 });
    }
  }, [userProfile?.macroTargets, macroForm]);

  const proteinValue = macroForm.watch("protein");
  const carbsValue = macroForm.watch("carbs");
  const fatValue = macroForm.watch("fat");
  const caloriesValue = macroForm.watch("calories");

  useEffect(() => {
    const protein = parseFloat(proteinValue as any) || 0;
    const carbs = parseFloat(carbsValue as any) || 0;
    const fat = parseFloat(fatValue as any) || 0;
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);

    const currentCalories = macroForm.getValues("calories");
    if (Math.round(calculatedCalories) !== Math.round(currentCalories)) {
      macroForm.setValue("calories", Math.round(calculatedCalories), {
        shouldValidate: true,
        shouldDirty: true
      });
    }
  }, [proteinValue, carbsValue, fatValue, macroForm]);

  useEffect(() => {
    if (!userProfile || !caloriesValue || isNaN(caloriesValue) || caloriesValue <= 0) {
        setWeightLossWarning(null);
        setEnergyAvailabilityWarning(null);
        return;
    }

    const { tdee, weightKg, sex, leanBodyMassKg } = userProfile;

    if (tdee && weightKg && tdee > caloriesValue) {
        const deficit = tdee - caloriesValue;
        const weeklyKgLoss = (deficit * 7) / 7700; 
        const weeklyPercentageLoss = (weeklyKgLoss / weightKg) * 100;

        if (weeklyPercentageLoss > 1) {
            setWeightLossWarning(
                `A target of ${Math.round(caloriesValue)} kcal may lead to a weekly weight loss of over 1% of your body mass. Rapid weight loss can be unsustainable and may risk muscle loss. A daily deficit of around ${Math.round((weightKg * 0.01 * 7700) / 7)} kcal is generally a safer upper limit.`
            );
        } else {
            setWeightLossWarning(null);
        }
    } else {
        setWeightLossWarning(null);
    }

    if (sex === 'female' && leanBodyMassKg) {
        const energyPerLbm = caloriesValue / leanBodyMassKg;
        if (energyPerLbm < 30) {
            setEnergyAvailabilityWarning(
                `For females, an intake below 30-45 kcal per kg of lean body mass can increase health risks, including impacts on metabolic rate and menstrual function. Please consult a healthcare professional if you have concerns.`
            );
        } else {
            setEnergyAvailabilityWarning(null);
        }
    } else {
        setEnergyAvailabilityWarning(null);
    }
  }, [caloriesValue, userProfile]);
  
  const fatLossCalculation = useMemo(() => {
    if (!userProfile?.weightKg || !userProfile.tdee) {
        return { weeklyLossKg: 0, calorieTarget: 0, enabled: false };
    }
    const weeklyLossKg = userProfile.weightKg * (lossPercentage / 100);
    const dailyDeficit = (weeklyLossKg * 7700) / 7;
    const calorieTarget = Math.round(userProfile.tdee - dailyDeficit);

    return { weeklyLossKg, calorieTarget, enabled: true };
  }, [userProfile?.weightKg, userProfile?.tdee, lossPercentage]);
  
  const muscleGainCalculation = useMemo(() => {
    if (!userProfile?.tdee || !userProfile.sex || !userProfile.training_experience_level) {
      return { monthlyGainKg: 0, calorieTarget: 0, enabled: false, reason: "Please specify your sex and training experience in your User Info to get a muscle gain target." };
    }
    const monthlyGainKg = getMonthlyGainKg(userProfile.sex, userProfile.training_experience_level);
    if (monthlyGainKg === 0) {
        return { monthlyGainKg: 0, calorieTarget: 0, enabled: false, reason: "Please specify your sex and training experience in your User Info to get a muscle gain target." };
    }
    const dailySurplus = (monthlyGainKg * 7700) / 30.44; // Avg days in month
    const calorieTarget = Math.round(userProfile.tdee + dailySurplus);
    return { monthlyGainKg, calorieTarget, enabled: true };
  }, [userProfile?.tdee, userProfile?.sex, userProfile?.training_experience_level]);


  const handleApplyCalorieTarget = (calorieTarget: number) => {
    const proteinGrams = macroForm.getValues("protein") || 0;
    const fatGrams = macroForm.getValues("fat") || 0;

    const caloriesFromProteinAndFat = (proteinGrams * 4) + (fatGrams * 9);
    const remainingCaloriesForCarbs = calorieTarget - caloriesFromProteinAndFat;

    if (remainingCaloriesForCarbs < 0) {
        toast({
            title: "Warning: High Protein/Fat",
            description: "Your protein and fat targets already exceed the calculated calorie goal. Please adjust them before applying this target.",
            variant: "destructive"
        });
        return;
    }

    const suggestedCarbs = Math.round(remainingCaloriesForCarbs / 4);
    macroForm.setValue("carbs", suggestedCarbs, { shouldDirty: true });
    
    // The useEffect will automatically update the calories field now
    toast({
        title: "Calorie Target Applied",
        description: `Carbs have been set to ${suggestedCarbs}g to meet your new calorie goal. Click 'Save Macro Targets' to confirm.`
    });
  };


  const handleMacroSubmit: SubmitHandler<MacroTargetFormValues> = (data) => {
    let newTargetRateKg: number | null = null;
    if (userProfile?.tdee && data.calories > 0) {
        const dailyDeficitOrSurplus = data.calories - userProfile.tdee;
        newTargetRateKg = (dailyDeficitOrSurplus * 7) / 7700;
    }
    
    setUserInformation({
      macroTargets: data,
      target_weight_change_rate_kg: newTargetRateKg
    });

    toast({
      title: "Macro Targets Updated",
      description: "Your daily caloric and macro targets have been saved.",
    });
    macroForm.reset(data); 
  };

  const handleGetProteinSuggestion = async (recommendationType: 'average' | 'safe' | 'flexible') => {
    if (!userProfile || !userProfile.leanBodyMassKg) {
      setAiError("Please complete your User Information (especially weight and body fat %) to calculate Lean Body Mass for an accurate protein suggestion.");
      toast({
        title: "User Info Needed",
        description: (
          <span>
            Complete your <Link href="/profile/user-info" className="underline">User Information</Link> to get a protein suggestion.
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    setIsAISuggesting(true);
    setProteinSuggestion(null);
    setAiError(null);
    setFatSuggestion(null); 
    setFatSuggestionError(null);


    try {
      const input: SuggestProteinIntakeInput = {
        leanBodyMassKg: userProfile.leanBodyMassKg,
        sex: userProfile.sex || 'notSpecified',
        recommendationType: recommendationType,
        unitPreference: 'g/kgLBM',
        athleteType: userProfile.athleteType || 'notSpecified',
        primaryGoal: userProfile.primaryGoal || 'notSpecified',
        bodyFatPercentage: userProfile.bodyFatPercentage,
      };
      const suggestion = await suggestProteinIntake(input);
      setProteinSuggestion(suggestion);
    } catch (error: any) {
      console.error("AI Protein Suggestion Error:", error);
      let detailedMessage = "Failed to get protein suggestion.";
      if (error.message) {
        detailedMessage = error.message;
      }
      if (error.digest) {
         detailedMessage += ` Server error digest: ${error.digest}. Check server logs for more details. Ensure your GOOGLE_API_KEY is correctly set up.`;
      } else {
        detailedMessage += " This might be a server-side issue. Check server logs for more details and ensure your GOOGLE_API_KEY is correctly set up if using AI features.";
      }
      setAiError(detailedMessage);
      toast({
        title: "AI Suggestion Error",
        description: detailedMessage,
        variant: "destructive",
      });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const applyProteinSuggestion = () => {
    if (proteinSuggestion) {
      const averageProtein = Math.round((proteinSuggestion.minProteinGramsPerDay + proteinSuggestion.maxProteinGramsPerDay) / 2);
      macroForm.setValue("protein", averageProtein, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Protein Target Applied",
        description: `Protein set to ${averageProtein}g. Adjust other macros as needed.`,
      });
    }
  };

  const handleGetFatSuggestion = () => {
    setProteinSuggestion(null);
    setAiError(null);
    setFatSuggestion(null);
    setFatSuggestionError(null);

    if (!userProfile) {
        setFatSuggestionError("User profile not loaded. Please try refreshing.");
        return;
    }
    if (!userProfile.tdee) {
        setFatSuggestionError("TDEE (Total Daily Energy Expenditure) is not calculated. Please complete your User Info (height, weight, age, sex, activity level) on the User Info page.");
        toast({
            title: "TDEE Needed for Fat Suggestion",
            description: (
                <span>
                    Complete your <Link href="/profile/user-info" className="underline">User Information</Link> to calculate TDEE.
                </span>
            ),
            variant: "destructive",
        });
        return;
    }

    let percentage: number;
    let rangeText: string;

    if (userProfile.sex === 'female') {
        percentage = 0.34;
        rangeText = "33-35%";
    } else if (userProfile.sex === 'male') {
        percentage = 0.25;
        rangeText = "20-30%";
    } else {
        percentage = 0.275;
        rangeText = "20-35%";
    }

    const suggestedFatGrams = (userProfile.tdee * percentage) / 9;
    const justificationText = `For a ${userProfile.sex || 'user'}, a balanced starting point for dietary fat is ${rangeText} of total daily calories. Based on your estimated TDEE of ~${userProfile.tdee.toFixed(0)} kcal, a target of ${Math.round(percentage * 100)}% suggests approximately ${Math.round(suggestedFatGrams)}g of fat per day. This provides essential fatty acids and supports hormone function.`;

    setFatSuggestion({
        suggestedFatGrams: Math.round(suggestedFatGrams),
        justification: justificationText,
    });
  };

  const applyFatSuggestion = () => {
    if (fatSuggestion) {
      macroForm.setValue("fat", fatSuggestion.suggestedFatGrams, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Fat Target Applied",
        description: `Fat set to ${fatSuggestion.suggestedFatGrams}g. Adjust other macros as needed.`,
      });
    }
  };


  return (
    <PageWrapper title="Dietary Targets">
       <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>Caloric & Macro Targets</CardTitle>
                <CardDescription>Set your nutritional goals. Use the helper tools below to get suggestions for protein, fat, and calories for weight loss.</CardDescription>
                </CardHeader>
                <Form {...macroForm}>
                <form onSubmit={macroForm.handleSubmit(handleMacroSubmit)}>
                    <CardContent className="space-y-4">
                    <FormField
                        control={macroForm.control}
                        name="protein"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Protein (g)</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                            <Card className="bg-muted/50 mt-4">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base flex items-center">
                                        <Sparkles className="mr-2 h-4 w-4 text-accent" />
                                        AI Protein Suggestion
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Get a protein target based on your Lean Body Mass (LBM). Select your preferred target type.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" size="sm" variant="outline" onClick={() => handleGetProteinSuggestion('average')} disabled={isAISuggesting}>
                                            {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Average"}
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => handleGetProteinSuggestion('safe')} disabled={isAISuggesting}>
                                            {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Safe"}
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => handleGetProteinSuggestion('flexible')} disabled={isAISuggesting}>
                                            {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Flexible"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </FormItem>
                        )}
                    />
                    {proteinSuggestion && !isAISuggesting && (
                        <Card className="bg-secondary/50 p-4">
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-md flex items-center text-primary">
                            <Lightbulb className="w-5 h-5 mr-2 text-accent" /> AI Protein Suggestion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-sm space-y-2">
                            <p>
                            Suggested Range: <strong>{proteinSuggestion.minProteinGramsPerDay.toFixed(0)}g - {proteinSuggestion.maxProteinGramsPerDay.toFixed(0)}g per day</strong>
                            </p>
                            <p>
                            (Factors: {proteinSuggestion.minProteinFactor.toFixed(2)} - {proteinSuggestion.maxProteinFactor.toFixed(2)} {proteinSuggestion.displayUnit})
                            </p>
                            <p className="text-xs text-muted-foreground italic">Justification: {proteinSuggestion.justification}</p>
                            <Button type="button" size="sm" onClick={applyProteinSuggestion} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                            Apply Suggestion (Average: {Math.round((proteinSuggestion.minProteinGramsPerDay + proteinSuggestion.maxProteinGramsPerDay) / 2)}g)
                            </Button>
                        </CardContent>
                        </Card>
                    )}
                    <FormField
                        control={macroForm.control}
                        name="fat"
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                            <FormLabel>Fat (g)</FormLabel>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleGetFatSuggestion}
                                disabled={!userProfile || !userProfile.tdee}
                                title={!userProfile || !userProfile.tdee ? "Requires user info to calculate TDEE" : "Get Suggestion"}
                                >
                                <Droplets className="mr-2 h-4 w-4 text-accent" />
                                Suggest Fat
                            </Button>
                            </div>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {fatSuggestion && !fatSuggestionError && (
                        <Card className="bg-secondary/50 p-4">
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-md flex items-center text-primary">
                            <Lightbulb className="w-5 h-5 mr-2 text-accent" /> Fat Intake Suggestion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-sm space-y-2">
                            <p>
                            Suggested Fat: <strong>~{fatSuggestion.suggestedFatGrams}g per day</strong>
                            </p>
                            <p className="text-xs text-muted-foreground italic">{fatSuggestion.justification}</p>
                            <Button type="button" size="sm" onClick={applyFatSuggestion} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                            Apply Suggestion ({fatSuggestion.suggestedFatGrams}g)
                            </Button>
                        </CardContent>
                        </Card>
                    )}
                    <FormField
                        control={macroForm.control}
                        name="carbs"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Carbohydrates (g)</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={macroForm.control}
                        name="calories"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Calculated Calories (kcal)</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} readOnly className="bg-muted/50 cursor-not-allowed" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {(weightLossWarning || energyAvailabilityWarning) && (
                        <div className="space-y-4 pt-4">
                        {weightLossWarning && (
                            <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Potential for Rapid Weight Loss</AlertTitle>
                            <AlertDescription>{weightLossWarning}</AlertDescription>
                            </Alert>
                        )}
                        {energyAvailabilityWarning && (
                            <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Low Energy Availability Warning</AlertTitle>
                            <AlertDescription>{energyAvailabilityWarning}</AlertDescription>
                            </Alert>
                        )}
                        </div>
                    )}
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" disabled={macroForm.formState.isSubmitting || !macroForm.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        {macroForm.formState.isSubmitting ? "Saving..." : "Save Macro Targets"}
                    </Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>
            {aiError && (
                <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>AI Suggestion Error</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
                </Alert>
            )}
             {fatSuggestionError && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Suggestion Info</AlertTitle>
                  <AlertDescription>{fatSuggestionError} <Link href="/profile/user-info" className="underline">Update User Info here.</Link></AlertDescription>
                </Alert>
            )}
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Calculator className="mr-2 h-5 w-5 text-accent"/>
                        Goal Calculator
                    </CardTitle>
                    <CardDescription>
                        Use these tools to set a calorie target for your specific goal. The calculator uses your TDEE as a baseline.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!userProfile?.tdee ? (
                        <Alert variant="destructive">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Missing Information</AlertTitle>
                            <AlertDescription>
                                Please complete your <Link href="/profile/user-info" className="underline">User Info</Link> (Weight, Height, Age, Activity Level) to use this calculator.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Tabs defaultValue={userProfile?.primaryGoal === 'muscleGain' ? 'gain' : 'loss'} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="loss">Fat Loss</TabsTrigger>
                                <TabsTrigger value="gain">Muscle Gain</TabsTrigger>
                            </TabsList>
                            <TabsContent value="loss" className="pt-4">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="loss-slider" className="flex items-center gap-2">
                                            Select Your Weekly Weight Loss Goal
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs">
                                                        <p className="font-bold">Making Your Choice:</p>
                                                        <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                                                            <li><span className="font-semibold">0.5%/week (Slower):</span> Recommended for leaner individuals or those who want to maximize muscle retention.</li>
                                                            <li><span className="font-semibold">1.0%/week (Faster):</span> A more aggressive goal suitable for individuals with a higher body fat percentage.</li>
                                                            <li>A slower rate is often more sustainable long-term. Choosing a rate that is too fast can lead to muscle loss and fatigue.</li>
                                                        </ul>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </Label>
                                        <Slider
                                            id="loss-slider"
                                            min={0.5}
                                            max={1.0}
                                            step={0.05}
                                            value={[lossPercentage]}
                                            onValueChange={(value) => setLossPercentage(value[0])}
                                            disabled={!fatLossCalculation.enabled}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Slower (0.5%)</span>
                                            <span>Faster (1.0%)</span>
                                        </div>
                                    </div>
                                    <Alert>
                                        <AlertTitle>Your Calculated Target</AlertTitle>
                                        <AlertDescription>
                                            A <span className="font-bold text-primary">{lossPercentage.toFixed(2)}%</span> goal means a loss of <span className="font-bold text-primary">{fatLossCalculation.weeklyLossKg.toFixed(2)} kg</span> per week.
                                            <br />
                                            Your resulting daily calorie target is <span className="font-bold text-accent">{fatLossCalculation.calorieTarget} kcal</span>.
                                        </AlertDescription>
                                    </Alert>
                                    <Button 
                                        type="button" 
                                        onClick={() => handleApplyCalorieTarget(fatLossCalculation.calorieTarget)}
                                        className="w-full"
                                        disabled={!fatLossCalculation.enabled}
                                    >
                                        Apply This Calorie Target (by adjusting Carbs)
                                    </Button>
                                </div>
                            </TabsContent>
                             <TabsContent value="gain" className="pt-4">
                                {!muscleGainCalculation.enabled ? (
                                    <Alert variant="destructive">
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Missing Information</AlertTitle>
                                        <AlertDescription>
                                            {muscleGainCalculation.reason || `Please complete your User Info (Sex & Training Experience) to get a calculated muscle gain target.`} <Link href="/profile/user-info" className="underline">Update here.</Link>
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <div className="space-y-6">
                                        <Alert>
                                            <AlertTitle>Your Calculated Target</AlertTitle>
                                            <AlertDescription>
                                                Based on your profile, a reasonable goal is a gain of <span className="font-bold text-primary">{muscleGainCalculation.monthlyGainKg.toFixed(2)} kg</span> per month.
                                                <br />
                                                Your resulting daily calorie target is <span className="font-bold text-accent">{muscleGainCalculation.calorieTarget} kcal</span>.
                                            </AlertDescription>
                                        </Alert>
                                        <Button 
                                            type="button" 
                                            onClick={() => handleApplyCalorieTarget(muscleGainCalculation.calorieTarget)}
                                            className="w-full"
                                        >
                                            Apply This Calorie Target (by adjusting Carbs)
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
            <Alert className="border-accent">
                <Lightbulb className="h-4 w-4" />
                <AlertTitle className="font-semibold text-accent">How to Set Your Targets</AlertTitle>
                <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li>First, complete your <Link href="/profile/user-info" className="underline hover:text-primary">User Info</Link> page to calculate your TDEE (Total Daily Energy Expenditure).</li>
                    <li>Use the 'Suggest Protein' and 'Suggest Fat' buttons to get AI-powered and calculated starting points for these macros.</li>
                    <li>Use the 'Goal Calculator' to find a calorie target for your goal, and apply it. This will adjust your 'Carbohydrates' to meet the target.</li>
                    <li>For **muscle gain**, use the 'Muscle Gain' tab. For **fat loss**, use the 'Fat Loss' tab.</li>
                </ul>
                </AlertDescription>
            </Alert>
        </div>
       </div>
    </PageWrapper>
  );

}
