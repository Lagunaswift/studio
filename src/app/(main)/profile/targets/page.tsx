//studio/src/app/(main)/profile/targets/page.tsx

"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { MacroTargets, TrainingExperienceLevel } from '@/types';
import { useEffect, useState, useMemo } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wand2, Loader2, Info, Lightbulb, Droplets, AlertTriangle, HelpCircle, Calculator } from "lucide-react";
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

interface ProteinSuggestion {
  minProteinGramsPerDay: number;
  maxProteinGramsPerDay: number;
  minProteinFactor: number;
  maxProteinFactor: number;
  displayUnit: string;
  justification: string;
}

interface FatSuggestion {
  suggestedFatGrams: number;
  justification: string;
}

const calculateProteinIntake = (
  leanBodyMassKg: number,
  recommendationType: 'average' | 'safe' | 'flexible',
  sex: string | null,
  primaryGoal: string | null,
  unitPreference: 'g/kgLBM' | 'g/lbLBM' = 'g/kgLBM'
): ProteinSuggestion => {
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
  
  const dailyProteinGrams = Math.round(factorGPerKg * leanBodyMassKg);
  const factorGPerLb = factorGPerKg * 0.453592;
  const displayFactor = unitPreference === 'g/kgLBM' ? factorGPerKg : factorGPerLb;
  
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

const getMonthlyGainKg = (sex: 'male' | 'female' | null | 'notSpecified', level: TrainingExperienceLevel | null): number => {
    if (!sex || sex === 'notSpecified' || !level || level === 'notSpecified') return 0;
    
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
  const { user } = useAuth();
  const { profile: userProfile, updateProfile } = useOptimizedProfile(user?.uid);
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

  useEffect(() => {
    if (userProfile?.macroTargets) {
      macroForm.reset(userProfile.macroTargets);
    }
  }, [userProfile?.macroTargets, macroForm]);

  const proteinValue = macroForm.watch("protein");
  const carbsValue = macroForm.watch("carbs");
  const fatValue = macroForm.watch("fat");
  const caloriesValue = macroForm.watch("calories");

  useEffect(() => {
    const calculatedCalories = (proteinValue * 4) + (carbsValue * 4) + (fatValue * 9);
    if (calculatedCalories !== caloriesValue) {
      macroForm.setValue("calories", calculatedCalories, { shouldValidate: false });
    }
  }, [proteinValue, carbsValue, fatValue, caloriesValue, macroForm]);

  const estimatedCaloriesFromMacros = useMemo(() => {
    return (proteinValue * 4) + (carbsValue * 4) + (fatValue * 9);
  }, [proteinValue, carbsValue, fatValue]);

  const hasCalorieDiscrepancy = Math.abs(caloriesValue - estimatedCaloriesFromMacros) > 5;

  const calculateCarbsFromCalories = (targetCalories: number) => {
    const caloriesFromProtein = proteinValue * 4;
    const caloriesFromFat = fatValue * 9;
    const remainingCaloriesForCarbs = targetCalories - caloriesFromProtein - caloriesFromFat;
    return Math.max(0, Math.round(remainingCaloriesForCarbs / 4));
  };

  const applyCalorieTarget = (targetCalories: number) => {
    const remainingCaloriesForCarbs = targetCalories - (proteinValue * 4) - (fatValue * 9);
    
    if (remainingCaloriesForCarbs < 0) {
        toast({
            title: "Calorie Target Too Low",
            description: "Your protein and fat targets already exceed this calorie goal. Please adjust them before applying this target.",
            variant: "destructive"
        });
        return;
    }

    const suggestedCarbs = Math.round(remainingCaloriesForCarbs / 4);
    macroForm.setValue("carbs", suggestedCarbs, { shouldDirty: true });
    
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
    
    updateProfile({
      macroTargets: data,
      target_weight_change_rate_kg: newTargetRateKg
    });

    toast({
      title: "Macro Targets Updated",
      description: "Your daily caloric and macro targets have been saved.",
    });
    macroForm.reset(data); 
  };

  const handleGetProteinSuggestion = (recommendationType: 'average' | 'safe' | 'flexible') => {
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

    setProteinSuggestion(null);
    setAiError(null);
    setFatSuggestion(null); 
    setFatSuggestionError(null);

    try {
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
        return;
    }

    const suggestion = calculateFatIntake(userProfile.tdee, userProfile.sex);
    setFatSuggestion(suggestion);
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
                                title={!userProfile || !userProfile.tdee ? "Complete User Info first" : "Get fat suggestion"}
                            >
                                <Droplets className="w-4 h-4 mr-1" />
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
                    {fatSuggestion && (
                        <Card className="bg-secondary/50 p-4">
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-md flex items-center text-primary">
                            <Lightbulb className="w-5 h-5 mr-2 text-accent" /> Fat Suggestion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-sm space-y-2">
                            <p>
                            Suggested: <strong>{fatSuggestion.suggestedFatGrams}g per day</strong>
                            </p>
                            <p className="text-xs text-muted-foreground italic">Justification: {fatSuggestion.justification}</p>
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
                            <FormLabel>Calories (kcal)</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} readOnly className="bg-muted" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                            Auto-calculated from macros: {estimatedCaloriesFromMacros.toFixed(0)} kcal
                            </p>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    {aiError && (
                        <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{aiError}</AlertDescription>
                        </Alert>
                    )}

                    {fatSuggestionError && (
                        <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{fatSuggestionError}</AlertDescription>
                        </Alert>
                    )}
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" className="w-full">Save Macro Targets</Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>

            {/* Calorie Target Helper Tools */}
            {userProfile?.tdee && (
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5 text-accent" />
                    Calorie Target Helpers
                    </CardTitle>
                    <CardDescription>
                    Use these tools to set a calorie target based on your goals. This will adjust your 'Carbohydrates' to meet the target.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="loss" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="loss">Fat Loss</TabsTrigger>
                        <TabsTrigger value="gain">Muscle Gain</TabsTrigger>
                    </TabsList>
                    <TabsContent value="loss" className="space-y-4">
                        <div>
                        <Label htmlFor="loss-slider">Weekly Weight Loss Target: {lossPercentage.toFixed(2)}% of body weight</Label>
                        <Slider
                            id="loss-slider"
                            min={0.25}
                            max={1.5}
                            step={0.05}
                            value={[lossPercentage]}
                            onValueChange={(value) => setLossPercentage(value[0])}
                            className="w-full mt-2"
                        />
                        </div>
                        {userProfile.weightKg && (
                        <div className="space-y-2">
                            <div className="text-sm">
                            <strong>Weekly Target:</strong> {(userProfile.weightKg * lossPercentage / 100).toFixed(2)} kg/week ({(userProfile.weightKg * lossPercentage / 100 * 2.20462).toFixed(2)} lbs/week)
                            </div>
                            <div className="text-sm">
                            <strong>Daily Calorie Target:</strong> {Math.round(userProfile.tdee - ((userProfile.weightKg * lossPercentage / 100) * 7700 / 7))} kcal
                            </div>
                            <Button 
                            onClick={() => applyCalorieTarget(Math.round(userProfile.tdee - ((userProfile.weightKg * lossPercentage / 100) * 7700 / 7)))}
                            size="sm"
                            variant="outline"
                            >
                            Apply Fat Loss Target
                            </Button>
                        </div>
                        )}
                    </TabsContent>
                    <TabsContent value="gain" className="space-y-4">
                        {userProfile.sex && userProfile.athleteType && (
                        <div className="space-y-2">
                            <div className="text-sm">
                            <strong>Recommended Monthly Gain:</strong> {getMonthlyGainKg(userProfile.sex, userProfile.athleteType).toFixed(2)} kg/month
                            </div>
                            <div className="text-sm">
                            <strong>Weekly Target:</strong> {(getMonthlyGainKg(userProfile.sex, userProfile.athleteType) / 4.33).toFixed(2)} kg/week
                            </div>
                            <div className="text-sm">
                            <strong>Daily Calorie Target:</strong> {Math.round(userProfile.tdee + ((getMonthlyGainKg(userProfile.sex, userProfile.athleteType) / 4.33) * 7700 / 7))} kcal
                            </div>
                            <Button 
                            onClick={() => applyCalorieTarget(Math.round(userProfile.tdee + ((getMonthlyGainKg(userProfile.sex, userProfile.athleteType) / 4.33) * 7700 / 7)))}
                            size="sm"
                            variant="outline"
                            >
                            Apply Muscle Gain Target
                            </Button>
                        </div>
                        )}
                    </TabsContent>
                    </Tabs>
                </CardContent>
                </Card>
            )}
        </div>

        <div className="space-y-8">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to Use This Page</AlertTitle>
                <AlertDescription className="text-sm">
                <ul className="list-disc pl-4 space-y-1 mt-2">
                    <li>Set your daily macro targets using the form on the left.</li>
                    <li>Use the **Protein Calculator** to get a science-based protein target.</li>
                    <li>Use the **Suggest Fat** button to get a balanced fat target.</li>
                    <li>Use the **Calorie Target Helpers** to set calories based on fat loss or muscle gain goals. This will adjust your 'Carbohydrates' to meet the target.</li>
                    <li>For **muscle gain**, use the 'Muscle Gain' tab. For **fat loss**, use the 'Fat Loss' tab.</li>
                </ul>
                </AlertDescription>
            </Alert>
        </div>
       </div>
    </PageWrapper>
  );
}
