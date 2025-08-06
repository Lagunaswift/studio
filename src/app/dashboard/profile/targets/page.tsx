//studio/src/app/(main)/profile/targets/page.tsx

"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import type { TrainingExperienceLevel } from '@/types'; // ✅ Remove MacroTargets import
import { useEffect, useState, useMemo } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Droplets, AlertTriangle, HelpCircle, Calculator, Info } from "lucide-react";
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ✅ Define MacroTargets locally if not in types
interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive").default(0),
  protein: z.coerce.number().min(0, "Protein must be positive").default(0),
  carbs: z.coerce.number().min(0, "Carbs must be positive").default(0),
  fat: z.coerce.number().min(0, "Fat must be positive").default(0),
});

type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;

// ✅ Define FatSuggestion interface locally
interface FatSuggestion {
  suggestedFatGrams: number;
  justification: string;
}

// ✅ Replace AI with simple calculation functions
interface ProteinSuggestion {
  minProteinGramsPerDay: number;
  maxProteinGramsPerDay: number;
  minProteinFactor: number;
  maxProteinFactor: number;
  displayUnit: string;
  justification: string;
}

const calculateProteinIntake = (
  leanBodyMassKg: number,
  recommendationType: 'average' | 'safe' | 'flexible',
  sex: string | null,
  primaryGoal: string | null,
  unitPreference: 'g/kgLBM' | 'g/lbLBM' = 'g/kgLBM'
): ProteinSuggestion => {
  // Lookup table from your AI prompt
  let factorGPerKg: number;
  
  switch (recommendationType) {
    case 'average':
      factorGPerKg = 2.35;
      break;
    case 'safe':
      factorGPerKg = 2.75;
      break;
    case 'flexible':
      factorGPerKg = (sex === 'female') ? 1.95 : 2.20;
      break;
    default:
      factorGPerKg = 2.35;
  }
  
  // Calculate daily protein
  const dailyProteinGrams = Math.round(factorGPerKg * leanBodyMassKg);
  
  // Convert factor for display
  const factorGPerLb = factorGPerKg * 0.453592; // Convert kg to lb
  const displayFactor = unitPreference === 'g/kgLBM' ? factorGPerKg : factorGPerLb;
  
  // Generate justification (same templates as AI)
  let justification: string;
  const goalText = primaryGoal || 'your fitness goals';
  
  switch (recommendationType) {
    case 'average':
      justification = `You selected the 'average' target. This is a strong, evidence-based goal designed to be enough to maximize muscle growth for most people. Based on your lean body mass, your daily protein target is around ${dailyProteinGrams}g. This intake will effectively support your primary goal of ${goalText}.`;
      break;
    case 'safe':
      justification = `You opted for the 'safe' approach. This is our 'better safe than sorry' recommendation, providing a slightly higher intake to ensure you're getting more than enough protein to fuel your results. For your lean body mass, this comes out to a daily target of about ${dailyProteinGrams}g. This is particularly effective for supporting your goal of ${goalText}.`;
      break;
    case 'flexible':
      justification = `You chose the 'flexible' target. This is a great option if you prefer a lower protein intake to allow for more dietary variety with carbs and fats, while still making great gains. Your target is around ${dailyProteinGrams}g per day. It's worth noting this is an estimate based on a general guideline, applied to your specific lean body mass for accuracy.`;
      break;
    default:
      justification = `Based on your lean body mass, your daily protein target is around ${dailyProteinGrams}g.`;
  }
  
  return {
    minProteinGramsPerDay: dailyProteinGrams,
    maxProteinGramsPerDay: dailyProteinGrams,
    minProteinFactor: displayFactor,
    maxProteinFactor: displayFactor,
    displayUnit: unitPreference,
    justification
  };
};

const calculateFatIntake = (tdee: number, sex: string | null): FatSuggestion => {
  let percentage: number;
  let rangeText: string;

  if (sex === 'female') {
    percentage = 0.30;
    rangeText = "25-35%";
  } else if (sex === 'male') {
    percentage = 0.25;
    rangeText = "20-30%";
  } else {
    percentage = 0.275;
    rangeText = "20-35%";
  }

  const suggestedFatGrams = Math.round((tdee * percentage) / 9);
  const justificationText = `For a ${sex || 'user'}, a balanced starting point for dietary fat is ${rangeText} of total daily calories. Based on your estimated TDEE of ~${tdee.toFixed(0)} kcal, a target of ${Math.round(percentage * 100)}% suggests approximately ${suggestedFatGrams}g of fat per day. This provides essential fatty acids and supports hormone function.`;

  return {
    suggestedFatGrams,
    justification: justificationText,
  };
};

// ✅ Fix type for getMonthlyGainKg function - only use valid TrainingExperienceLevel values
const getMonthlyGainKg = (
  sex: 'male' | 'female' | null | 'notSpecified', 
  level: TrainingExperienceLevel | null
): number => {
    if (!sex || sex === 'notSpecified' || !level || level === 'notSpecified') return 0;
    
    // ✅ Only use the actual TrainingExperienceLevel values
    const validLevels = ['beginner', 'intermediate', 'advanced'] as const;
    if (!validLevels.includes(level as any)) return 0;
    
    if (sex === 'female') {
        switch(level) {
            case 'beginner': return 0.75;
            case 'intermediate': return 0.55;
            case 'advanced': return 0.325;
            default: return 0;
        }
    } else { // male
        switch(level) {
            case 'beginner': return 1.5;
            case 'intermediate': return 1.0;
            case 'advanced': return 0.65;
            default: return 0;
        }
    }
};

export default function DietaryTargetsPage() {
  // ✅ Updated to use new data fetching pattern
  const { user } = useAuth(); // Only for auth status
  const { profile: userProfile, loading, error } = useUserProfile(user); // ✅ Use new hook
  
  const { toast } = useToast();
  const [proteinSuggestion, setProteinSuggestion] = useState<ProteinSuggestion | null>(null);
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

  // ✅ Updated to use profile from new hook
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
    
    // ✅ Add type validation for training_experience_level - only use valid values
    const validLevels = ['beginner', 'intermediate', 'advanced'] as const;
    const level = validLevels.includes(userProfile.training_experience_level as any) 
      ? userProfile.training_experience_level as TrainingExperienceLevel 
      : null;
    
    const monthlyGainKg = getMonthlyGainKg(userProfile.sex, level);
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

  // ✅ Updated to use server action instead of old updateUserData
  const handleMacroSubmit: SubmitHandler<MacroTargetFormValues> = async (data) => {
    if (!user?.uid) {
      toast({
        title: "Authentication Error",
        description: "Please log in to save your targets.",
        variant: "destructive",
      });
      return;
    }

    try {
      let newTargetRateKg: number | null = null;
      if (userProfile?.tdee && data.calories > 0) {
          const dailyDeficitOrSurplus = data.calories - userProfile.tdee;
          newTargetRateKg = (dailyDeficitOrSurplus * 7) / 7700;
      }
      
      // ✅ Use server action instead of context function
      const { updateUserProfile } = await import('@/app/dashboard/profile/actions');
      await updateUserProfile(user.uid, {
        macroTargets: data,
        target_weight_change_rate_kg: newTargetRateKg
      });

      toast({
        title: "Macro Targets Updated",
        description: "Your daily caloric and macro targets have been saved.",
      });
      macroForm.reset(data); 
    } catch (error: any) {
      toast({
        title: "Error Saving Targets",
        description: error.message || 'An unknown error occurred.',
        variant: "destructive",
      });
    }
  };

  // ✅ Simplified protein suggestion (no AI needed)
  const handleGetProteinSuggestion = (recommendationType: 'average' | 'safe' | 'flexible') => {
    if (!userProfile || !userProfile.leanBodyMassKg) {
      setAiError("Please complete your User Information (especially weight and body fat %) to calculate Lean Body Mass for an accurate protein suggestion.");
      toast({
        title: "User Info Needed",
        description: (
          <span>
            Complete your <Link href="/dashboard/profile/user-info" className="underline">User Information</Link> to get a protein suggestion.
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    // Clear previous states
    setProteinSuggestion(null);
    setAiError(null);
    setFatSuggestion(null); 
    setFatSuggestionError(null);

    try {
      // ✅ Use local calculation instead of AI API
      const suggestion = calculateProteinIntake(
        userProfile.leanBodyMassKg,
        recommendationType,
        userProfile.sex,
        userProfile.primaryGoal,
        'g/kgLBM'
      );
      
      setProteinSuggestion(suggestion);
      
      toast({
        title: "Protein Target Calculated",
        description: `Suggested ${suggestion.minProteinGramsPerDay}g protein based on your lean body mass.`,
      });
    } catch (error: any) {
      console.error("Protein Calculation Error:", error);
      setAiError("Failed to calculate protein suggestion. Please try again.");
      toast({
        title: "Calculation Error",
        description: "Failed to calculate protein suggestion. Please try again.",
        variant: "destructive",
      });
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

  // ✅ Simplified fat suggestion (no AI needed)
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
                    Complete your <Link href="/dashboard/profile/user-info" className="underline">User Information</Link> to calculate TDEE.
                </span>
            ),
            variant: "destructive",
        });
        return;
    }

    try {
      // ✅ Use local calculation instead of complex logic
      const suggestion = calculateFatIntake(userProfile.tdee, userProfile.sex);
      setFatSuggestion(suggestion);
      
      toast({
        title: "Fat Target Calculated",
        description: `Suggested ${suggestion.suggestedFatGrams}g fat based on your TDEE.`,
      });
    } catch (error: any) {
      console.error("Fat Calculation Error:", error);
      setFatSuggestionError("Failed to calculate fat suggestion. Please try again.");
      toast({
        title: "Calculation Error",
        description: "Failed to calculate fat suggestion. Please try again.",
        variant: "destructive",
      });
    }
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

  // ✅ Add loading and error states
  if (loading || !user) {
    return (
      <PageWrapper title="Dietary Targets">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Loading your profile data...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Dietary Targets">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Profile</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  // ✅ Debug: Log TDEE value
  console.log('🔍 Targets Page Debug:', {
    userProfile: userProfile ? 'Profile loaded' : 'No profile',
    tdee: userProfile?.tdee,
    hasRequiredData: !!(userProfile?.tdee && userProfile?.weightKg)
  });

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
                                        <Calculator className="mr-2 h-4 w-4 text-accent" />
                                        Protein Calculator
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Get a protein target based on your Lean Body Mass (LBM). Select your preferred target type.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" size="sm" variant="outline" onClick={() => handleGetProteinSuggestion('average')}>
                                            Average
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => handleGetProteinSuggestion('safe')}>
                                            Safe
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => handleGetProteinSuggestion('flexible')}>
                                            Flexible
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </FormItem>
                        )}
                    />
                    {proteinSuggestion && (
                        <Card className="bg-secondary/50 p-4">
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-md flex items-center text-primary">
                            <Lightbulb className="w-5 h-5 mr-2 text-accent" /> Protein Suggestion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-sm space-y-2">
                            <p>
                            Suggested Protein: <strong>{proteinSuggestion.minProteinGramsPerDay}g per day</strong>
                            </p>
                            <p>
                            (Factor: {proteinSuggestion.minProteinFactor.toFixed(2)} {proteinSuggestion.displayUnit})
                            </p>
                            <p className="text-xs text-muted-foreground italic">Justification: {proteinSuggestion.justification}</p>
                            <Button type="button" size="sm" onClick={applyProteinSuggestion} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                            Apply Suggestion ({proteinSuggestion.minProteinGramsPerDay}g)
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
                  <AlertDescription>{fatSuggestionError} <Link href="/dashboard/profile/user-info" className="underline">Update User Info here.</Link></AlertDescription>
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
                                Please complete your <Link href="/dashboard/profile/user-info" className="underline">User Info</Link> (Weight, Height, Age, Activity Level) to use this calculator.
                                <br />
                                <small className="text-xs opacity-70">
                                  Debug: TDEE = {userProfile?.tdee || 'null'}, Weight = {userProfile?.weightKg || 'null'}
                                </small>
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
                                            {muscleGainCalculation.reason || `Please complete your User Info (Sex & Training Experience) to get a calculated muscle gain target.`} <Link href="/dashboard/profile/user-info" className="underline">Update here.</Link>
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
                    <li>First, complete your <Link href="/dashboard/profile/user-info" className="underline hover:text-primary">User Info</Link> page to calculate your TDEE (Total Daily Energy Expenditure).</li>
                    <li>Use the 'Suggest Protein' and 'Suggest Fat' buttons to get starting points for these macros.</li>
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