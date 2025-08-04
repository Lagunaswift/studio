"use client";

import { useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile'; // ✅ Add this import
import { useToast } from '@/hooks/use-toast';
import type { UserProfileSettings, Sex, ActivityLevel, AthleteType, PrimaryGoal, TrainingExperienceLevel, MenopauseStatus } from '@/types';
import { SEX_OPTIONS, ACTIVITY_LEVEL_OPTIONS, ATHLETE_TYPE_OPTIONS, PRIMARY_GOAL_OPTIONS, TRAINING_EXPERIENCE_OPTIONS, MENOPAUSE_STATUS_OPTIONS } from '@/types';
import { Save, Calculator, Activity, UserCircle, Target as TargetIcon, Dumbbell, Mail, User as UserIcon, Ruler, Scale, Award } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getDefaultUserProfile } from '@/utils/profileDefaults';

// ... (keep all your calculation functions and schema - they're correct)

const calculateLBM = (weightKg: number | null | undefined, bodyFatPercentage: number | null | undefined): number | null => {
    if (weightKg && weightKg > 0 && bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
        const lbm = weightKg * (1 - bodyFatPercentage / 100);
        if (isNaN(lbm) || !isFinite(lbm) || lbm <= 0) return null;
        return parseFloat(lbm.toFixed(1));
    }
    return null;
};

const calculateTDEE = (
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
  age: number | null | undefined,
  sex: string | null | undefined,
  activityLevel: string | null | undefined
): number | null => {
  if (!weightKg || !heightCm || !age || !sex || !activityLevel || activityLevel === 'notSpecified' || sex === 'notSpecified') return null;
  let bmr: number;
  if (sex === 'male') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  
  // Map your database values to multipliers
  const activityMultipliers: { [key: string]: number } = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'veryActive': 1.9
  };
  
  const multiplier = activityMultipliers[activityLevel];
  if (multiplier) {
    const tdee = bmr * multiplier;
    if (isNaN(tdee) || !isFinite(tdee) || tdee <= 0) return null;
    return Math.round(tdee);
  }
  return null;
};

const calculateNavyBodyFatPercentage = (
  sex: string | null | undefined,
  heightCm: number | null | undefined,
  neckCm: number | null | undefined,
  abdomenCm?: number | null | undefined,
  waistCm?: number | null | undefined,
  hipCm?: number | null | undefined
): number | null => {
  if (!sex || !heightCm || heightCm <= 0 || !neckCm || neckCm <= 0) {
    return null;
  }

  try {
    if (sex === 'male') {
      if (!abdomenCm || abdomenCm <= 0 || abdomenCm <= neckCm) {
         console.warn("Male BFP calc: Abdomen must be > Neck and > 0.");
        return null;
      }
      const bf = 86.010 * Math.log10(abdomenCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
      return Math.max(1, Math.min(100, parseFloat(bf.toFixed(1))));
    } else if (sex === 'female') {
      if (!waistCm || waistCm <= 0 || !hipCm || hipCm <= 0) {
        console.warn("Female BFP calc: Waist and Hip must be > 0.");
        return null;
      }
      const waistPlusHipMinusNeck = waistCm + hipCm - neckCm;
      if (waistPlusHipMinusNeck <= 0) {
        console.warn("Female BFP calc: Waist + Hip - Neck must be > 0.");
        return null;
      }
      const bf = 163.205 * Math.log10(waistPlusHipMinusNeck) - 97.684 * Math.log10(heightCm) - 78.387;
      return Math.max(1, Math.min(100, parseFloat(bf.toFixed(1))));
    }
  } catch (error) {
    console.error("Error in Navy BFP calculation:", error);
    return null;
  }
  return null;
};

const userInfoSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100, "Name is too long.").nullable().optional(),
  email: z.string().email("Invalid email address.").nullable().optional(),
  heightCm: z.coerce.number().min(50, "Height must be at least 50cm").max(300, "Height must be at most 300cm").nullable().optional(),
  weightKg: z.coerce.number().min(20, "Weight must be at least 20kg").max(500, "Weight must be at most 500kg").nullable().optional(),
  age: z.coerce.number().min(1, "Age must be at least 1").max(120, "Age must be at most 120").nullable().optional(),
  sex: z.enum(['male', 'female', 'notSpecified'], { errorMap: () => ({ message: 'Please select a sex.' }) }).nullable(),
  menopauseStatus: z.enum(['notSpecified', 'pre', 'post'] as const).nullable().optional(),
  activityLevel: z.enum(['notSpecified', 'sedentary', 'lightlyActive', 'moderatelyActive', 'veryActive', 'extraActive'] as const).nullable().optional(),
  training_experience_level: z.enum(['notSpecified', 'beginner', 'intermediate', 'advanced'] as const).nullable().optional(),
  bodyFatPercentage: z.coerce.number().min(1, "Body fat % must be at least 1").max(70, "Body fat % must be at most 70").nullable().optional(),
  athleteType: z.enum(['notSpecified', 'endurance', 'strength'] as const).nullable().optional(),
  primaryGoal: z.enum(['notSpecified', 'weightLoss', 'muscleGain', 'maintenance', 'performance'] as const).nullable().optional(),
  neck_circumference_cm: z.coerce.number().min(1, "Neck circumference must be positive").nullable().optional(),
  abdomen_circumference_cm: z.coerce.number().min(1, "Abdomen circumference must be positive").nullable().optional(),
  waist_circumference_cm: z.coerce.number().min(1, "Waist circumference must be positive").nullable().optional(),
  hip_circumference_cm: z.coerce.number().min(1, "Hip circumference must be positive").nullable().optional(),
}).refine(data => {
  if (data.sex === 'male' && data.abdomen_circumference_cm && data.neck_circumference_cm) {
    return data.abdomen_circumference_cm > data.neck_circumference_cm;
  }
  return true;
}, {
  message: "Abdomen circumference must be greater than neck circumference for males.",
  path: ["abdomen_circumference_cm"],
}).refine(data => {
    if (data.sex === 'female' && data.waist_circumference_cm && data.hip_circumference_cm && data.neck_circumference_cm) {
        return (data.waist_circumference_cm + data.hip_circumference_cm) > data.neck_circumference_cm;
    }
    return true;
}, {
    message: "For females, the sum of waist and hip circumferences must be greater than neck circumference.",
    path: ["hip_circumference_cm"],
});

type UserInfoFormValues = z.infer<typeof userInfoSchema>;

function UserInfoPageSkeleton() {
    return (
        <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full max-w-lg" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-36" />
                </CardFooter>
            </Card>
            <Card className="md:col-span-1">
                 <CardHeader>
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-full max-w-xs" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-24" /></div>
                     <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-24" /></div>
                </CardContent>
            </Card>
        </div>
    )
}

// ✅ Updated form component to handle server actions properly
function UserInfoForm({ userProfile, onUpdateProfile }: { 
  userProfile: UserProfileSettings, 
  onUpdateProfile: (updates: Partial<UserProfileSettings>) => Promise<void> 
}) {
  const { toast } = useToast();
  const [calculationMessage, setCalculationMessage] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<boolean>(false);

  // Create a stable default value object by merging defaults with the actual profile
  const defaultValues = useMemo(() => {
    const merged = {
      ...getDefaultUserProfile(''),
      ...userProfile,
    };
    
    // Ensure all enum fields have valid values
    return {
      ...merged,
      sex: merged.sex === 'notSpecified' ? null : merged.sex || null,
      activityLevel: merged.activityLevel || 'notSpecified',
      training_experience_level: merged.training_experience_level || 'notSpecified',
      athleteType: merged.athleteType || 'notSpecified',
      primaryGoal: merged.primaryGoal || 'notSpecified',
      menopauseStatus: merged.menopauseStatus || 'notSpecified',
    } as UserInfoFormValues;
  }, [userProfile]);
  
  const form = useForm<UserInfoFormValues>({
    resolver: zodResolver(userInfoSchema),
    defaultValues,
  });
  
  // This effect synchronizes the form state if the userProfile from context changes.
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const watchedFormValues = form.watch();

  const liveTdee = useMemo(() => {
    return calculateTDEE(watchedFormValues.weightKg, watchedFormValues.heightCm, watchedFormValues.age, watchedFormValues.sex, watchedFormValues.activityLevel);
  }, [watchedFormValues.weightKg, watchedFormValues.heightCm, watchedFormValues.age, watchedFormValues.sex, watchedFormValues.activityLevel]);

  const liveLbm = useMemo(() => {
    return calculateLBM(watchedFormValues.weightKg, watchedFormValues.bodyFatPercentage);
  }, [watchedFormValues.weightKg, watchedFormValues.bodyFatPercentage]);
  
  const onSubmit: SubmitHandler<UserInfoFormValues> = async (data) => {
    try {
        // Debug: Log what we're trying to save
        console.log('🔍 Form submission data:', {
          athleteType: data.athleteType,
          primaryGoal: data.primaryGoal,
          activityLevel: data.activityLevel,
          fullData: data
        });
        
        await onUpdateProfile(data as Partial<UserProfileSettings>); 
        toast({
          title: "User Information Saved",
          description: "Your profile details have been updated.",
        });
        form.reset(data, { keepDirty: false, keepValues: true });
    } catch (error: any) {
        console.error('❌ Form submission error:', error);
        toast({
          title: "Error Saving Profile",
          description: error.message || 'An unknown error occurred.',
          variant: "destructive",
        });
    }
  };
  
  const handleCalculateBodyFat = () => {
    setCalculationMessage(null);
    setCalculationError(false);
    const { heightCm, sex, neck_circumference_cm, abdomen_circumference_cm, waist_circumference_cm, hip_circumference_cm } = form.getValues();

    if (!sex || !heightCm || !neck_circumference_cm) {
      setCalculationMessage("Sex, Height, and Neck circumference are required for body fat calculation.");
      setCalculationError(true);
      toast({ title: "Missing Information", description: "Sex, Height, and Neck circumference are required.", variant: "destructive"});
      return;
    }

    let calculatedBFP: number | null = null;
    if (sex === 'male') {
        if (!abdomen_circumference_cm) {
            setCalculationMessage("Abdomen circumference is required for male body fat calculation.");
            setCalculationError(true);
            toast({ title: "Missing Information", description: "Abdomen circumference is required for males.", variant: "destructive"});
            return;
        }
         if (abdomen_circumference_cm <= neck_circumference_cm) {
            setCalculationMessage("For males, abdomen circumference must be greater than neck circumference.");
            setCalculationError(true);
            toast({ title: "Invalid Measurements", description: "Abdomen must be greater than neck for males.", variant: "destructive"});
            return;
        }
    } else if (sex === 'female') {
        if (!waist_circumference_cm || !hip_circumference_cm) {
            setCalculationMessage("Waist and Hip circumferences are required for female body fat calculation.");
            setCalculationError(true);
            toast({ title: "Missing Information", description: "Waist and Hip circumferences are required for females.", variant: "destructive"});
            return;
        }
        if ((waist_circumference_cm + hip_circumference_cm) <= neck_circumference_cm) {
            setCalculationMessage("For females, (Waist + Hip) must be greater than Neck circumference.");
            setCalculationError(true);
            toast({ title: "Invalid Measurements", description: "For females, (Waist + Hip) must be > Neck.", variant: "destructive"});
            return;
        }
    }

    calculatedBFP = calculateNavyBodyFatPercentage(
      sex,
      heightCm,
      neck_circumference_cm,
      abdomen_circumference_cm,
      waist_circumference_cm,
      hip_circumference_cm
    );

    if (calculatedBFP !== null && !isNaN(calculatedBFP)) {
      form.setValue("bodyFatPercentage", parseFloat(calculatedBFP.toFixed(1)), { shouldValidate: true, shouldDirty: true });
      setCalculationMessage(`Estimated Body Fat: ${calculatedBFP.toFixed(1)}%. This value has been updated in the form.`);
      setCalculationError(false);
      toast({ title: "Body Fat Calculated", description: `Estimated at ${calculatedBFP.toFixed(1)}%. You can now save your profile.`});
    } else {
      setCalculationMessage("Could not calculate body fat percentage. Please check your measurements. Ensure abdomen > neck (males) or waist + hip > neck (females).");
      setCalculationError(true);
      toast({ title: "Calculation Error", description: "Please check measurements. Abdomen > Neck (M), Waist + Hip > Neck (F).", variant: "destructive"});
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center"><UserCircle className="mr-2 h-5 w-5 text-accent"/> Your Details</CardTitle>
          <CardDescription>
            Provide your name, email, physical attributes, activity level, and goals to help personalize your experience.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Name</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Your Name" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="heightCm" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Ruler className="mr-2 h-4 w-4 text-muted-foreground"/>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="weightKg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age (years)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="sex" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'male') {
                              form.setValue('waist_circumference_cm', null, { shouldValidate: true });
                              form.setValue('hip_circumference_cm', null, { shouldValidate: true });
                              form.setValue('menopauseStatus', 'notSpecified', { shouldValidate: true });
                          } else if (value === 'female') {
                              form.setValue('abdomen_circumference_cm', null, { shouldValidate: true });
                          }
                        }}
                        value={field.value || 'notSpecified'}
                       >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="notSpecified">Not Specified</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {watchedFormValues.sex === 'female' && (
                <FormField control={form.control} name="menopauseStatus" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Menopause Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'notSpecified'}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {MENOPAUSE_STATUS_OPTIONS.map(option => (
                                    <SelectItem key={option} value={option}>
                                        {option === 'notSpecified' ? 'Not Specified' : option === 'pre' ? 'Pre-menopause' : 'Post-menopause'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
              )}
               <div className="grid sm:grid-cols-2 gap-6">
                 <FormField control={form.control} name="training_experience_level" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-muted-foreground"/>Training Experience</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'notSpecified'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your training level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="notSpecified">Not Specified</SelectItem>
                        <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                        <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="activityLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Activity className="mr-2 h-4 w-4 text-muted-foreground"/> Activity Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'notSpecified'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="notSpecified">Not Specified</SelectItem>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="light">Light Activity</SelectItem>
                        <SelectItem value="moderate">Moderate Activity</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="veryActive">Very Active</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
               </div>

              <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                  <h4 className="text-md font-semibold text-primary flex items-center mb-3">
                      <Scale className="mr-2 h-5 w-5 text-accent"/> Body Measurements (for optional Body Fat % calc)
                  </h4>
                  <FormField control={form.control} name="neck_circumference_cm" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Neck Circumference (cm)</FormLabel>
                          <FormControl>
                          <Input type="number" step="0.1" placeholder="e.g., 38.5" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  {watchedFormValues.sex === 'male' && (
                      <FormField control={form.control} name="abdomen_circumference_cm" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Abdomen Circumference (cm)</FormLabel>
                              <FormControl>
                              <Input type="number" step="0.1" placeholder="e.g., 90.0 (at navel level)" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                  )}
                  {watchedFormValues.sex === 'female' && (
                      <>
                      <FormField control={form.control} name="waist_circumference_cm" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Waist Circumference (cm)</FormLabel>
                              <FormControl>
                              <Input type="number" step="0.1" placeholder="e.g., 70.0 (narrowest point)" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="hip_circumference_cm" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Hip Circumference (cm)</FormLabel>
                              <FormControl>
                              <Input type="number" step="0.1" placeholder="e.g., 95.0 (widest point)" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      </>
                  )}
                  <Button type="button" variant="outline" onClick={handleCalculateBodyFat} className="mt-2 w-full sm:w-auto">
                      <Calculator className="mr-2 h-4 w-4 text-accent"/> Calculate Body Fat % (Navy Method)
                  </Button>
                  {calculationMessage && (
                       <Alert variant={calculationError ? "destructive" : "default"} className="mt-2">
                          <AlertTitle>{calculationError ? "Error" : "Info"}</AlertTitle>
                          <AlertDescription>{calculationMessage}</AlertDescription>
                      </Alert>
                  )}
              </div>

              <FormField control={form.control} name="bodyFatPercentage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Fat % (Direct Entry or Calculated)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 15.5" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="athleteType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Dumbbell className="mr-2 h-4 w-4 text-muted-foreground"/> Athlete Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'notSpecified'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select athlete type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="notSpecified">Not Specified</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                        <SelectItem value="strengthPower">Strength/Power</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="primaryGoal" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><TargetIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Primary Goal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'notSpecified'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="notSpecified">Not Specified</SelectItem>
                        <SelectItem value="fatLoss">Fat Loss</SelectItem>
                        <SelectItem value="muscleGain">Muscle Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? "Saving..." : "Save Information"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center"><Calculator className="mr-2 h-5 w-5 text-accent"/> Calculated Estimates</CardTitle>
          <CardDescription>
            Based on your inputs. These help in setting macro targets. LBM requires Body Fat %.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Estimated TDEE (Total Daily Energy Expenditure)</h3>
            <p className="text-2xl font-bold text-primary">
              {liveTdee ? `${liveTdee.toLocaleString()} kcal/day` : 'N/A'}
            </p>
            {!liveTdee && <p className="text-xs text-muted-foreground mt-1">Requires height, weight, age, sex, and activity level.</p>}
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Estimated Lean Body Mass (LBM)</h3>
            <p className="text-2xl font-bold text-primary">
              {liveLbm ? `${liveLbm.toFixed(1)} kg` : 'N/A'}
            </p>
            {!liveLbm && <p className="text-xs text-muted-foreground mt-1">Requires weight and body fat %.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ✅ MAIN FIX: Updated to use the new useUserProfile hook + server actions
export default function UserInfoPage() {
  const { user, isLoading: authLoading } = useAuth(); // Get auth loading state
  const { profile, loading: profileLoading, error } = useUserProfile(user); // ✅ Pass user to hook
  
  // Combined loading state
  const loading = authLoading || profileLoading;
  
  // Create a merged profile that includes defaults for any missing values
  const formProfile = useMemo(() => {
    if (!profile) return getDefaultUserProfile('');
    
    // Debug: Log the actual profile data
    console.log('🔍 Profile data in form:', {
      profile,
      hasName: !!profile.name,
      hasEmail: !!profile.email,
      primaryGoal: profile.primaryGoal,
      activityLevel: profile.activityLevel,
    });
    
    return {
      ...getDefaultUserProfile(''),
      ...profile,
    };
  }, [profile]);

  // ✅ Import and use server actions for updates
  const handleUpdateProfile = async (updates: Partial<UserProfileSettings>) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    
    console.log('🔍 Sending to server action:', {
      userId: user.uid,
      updates: {
        athleteType: updates.athleteType,
        primaryGoal: updates.primaryGoal,
        activityLevel: updates.activityLevel,
        // Show first few fields for debugging
        name: updates.name,
        email: updates.email
      }
    });
    
    // Import the server action dynamically to avoid issues
    const { updateUserProfile } = await import('@/app/(main)/profile/actions');
    const result = await updateUserProfile(user.uid, updates);
    
    console.log('✅ Server action result:', result);
    return result;
  };

  // Handle loading state - wait for both auth and profile
  if (loading || !user) {
    return (
      <PageWrapper title="User Information">
        <UserInfoPageSkeleton />
      </PageWrapper>
    );
  }

  // Handle error state
  if (error) {
    return (
      <PageWrapper title="User Information">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Profile</AlertTitle>
          <AlertDescription>
            {error}
            <br />
            <small>User ID: {user?.uid || 'Not available'}</small>
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  // Debug: Add some logging
  console.log('🔍 Profile Page Debug:', {
    user: user?.uid,
    profile: profile ? 'Profile loaded' : 'No profile',
    formProfile: formProfile ? 'Form profile ready' : 'No form profile',
    loading,
    error
  });

  return (
    <PageWrapper title="User Information">
      <UserInfoForm 
        userProfile={formProfile} 
        onUpdateProfile={handleUpdateProfile} 
      />
    </PageWrapper>
  );
}