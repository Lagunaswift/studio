
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
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { UserProfileSettings, Sex, ActivityLevel, AthleteType, PrimaryGoal, TrainingExperienceLevel } from '@/types';
import { SEX_OPTIONS, ACTIVITY_LEVEL_OPTIONS, ATHLETE_TYPE_OPTIONS, PRIMARY_GOAL_OPTIONS, TRAINING_EXPERIENCE_OPTIONS } from '@/types';
import { Save, Calculator, Activity, UserCircle, Target as TargetIcon, Dumbbell, Mail, User as UserIcon, Ruler, Scale, Award, Crown, Trash2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getDefaultUserProfile } from '@/utils/profileDefaults';


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
  sex: Sex | null | undefined,
  activityLevel: ActivityLevel | null | undefined
): number | null => {
  if (!weightKg || !heightCm || !age || !sex || !activityLevel || activityLevel === 'notSpecified') return null;
  let bmr: number;
  if (sex === 'male') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const activity = ACTIVITY_LEVEL_OPTIONS.find(opt => opt.value === activityLevel);
  if (activity) {
    const tdee = bmr * activity.multiplier;
    if (isNaN(tdee) || !isFinite(tdee) || tdee <= 0) return null;
    return Math.round(tdee);
  }
  return null;
};


const calculateNavyBodyFatPercentage = (
  sex: Sex | null | undefined,
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
  sex: z.enum(['male', 'female']).nullable(),
  activityLevel: z.enum(ACTIVITY_LEVEL_OPTIONS.map(o => o.value) as [ActivityLevel, ...ActivityLevel[]]).nullable().optional(),
  training_experience_level: z.enum(TRAINING_EXPERIENCE_OPTIONS.map(o => o.value) as [TrainingExperienceLevel, ...TrainingExperienceLevel[]]).nullable().optional(),
  bodyFatPercentage: z.coerce.number().min(1, "Body fat % must be at least 1").max(70, "Body fat % must be at most 70").nullable().optional(),
  athleteType: z.enum(ATHLETE_TYPE_OPTIONS.map(o => o.value) as [AthleteType, ...AthleteType[]]).nullable().optional(),
  primaryGoal: z.enum(PRIMARY_GOAL_OPTIONS.map(o => o.value) as [PrimaryGoal, ...PrimaryGoal[]]).nullable().optional(),
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

function UserInfoForm({ userProfile, updateProfile }: { userProfile: UserProfileSettings, updateProfile: (updates: Partial<UserProfileSettings>) => Promise<{success: boolean, error?: string}> }) {
  const { toast } = useToast();
  const [calculationMessage, setCalculationMessage] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<boolean>(false);

  const defaultValues = useMemo(() => ({
    ...getDefaultUserProfile(''),
    ...userProfile,
  }), [userProfile]);
  
  const form = useForm<UserInfoFormValues>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form.reset]);

  const watchedFormValues = form.watch();

  const liveTdee = useMemo(() => {
    return calculateTDEE(watchedFormValues.weightKg, watchedFormValues.heightCm, watchedFormValues.age, watchedFormValues.sex, watchedFormValues.activityLevel);
  }, [watchedFormValues.weightKg, watchedFormValues.heightCm, watchedFormValues.age, watchedFormValues.sex, watchedFormValues.activityLevel]);

  const liveLbm = useMemo(() => {
    return calculateLBM(watchedFormValues.weightKg, watchedFormValues.bodyFatPercentage);
  }, [watchedFormValues.weightKg, watchedFormValues.bodyFatPercentage]);
  
  const onSubmit: SubmitHandler<UserInfoFormValues> = async (data) => {
    try {
        await updateProfile(data as Partial<UserProfileSettings>); 
        toast({
          title: "User Information Saved",
          description: "Your profile details have been updated.",
        });
        form.reset(data, { keepDirty: false, keepValues: true });
    } catch (error: any) {
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
                          field.onChange(value as Sex);
                          if (value === 'male') {
                              form.setValue('waist_circumference_cm', null, { shouldValidate: true });
                              form.setValue('hip_circumference_cm', null, { shouldValidate: true });
                          } else if (value === 'female') {
                              form.setValue('abdomen_circumference_cm', null, { shouldValidate: true });
                          }
                        }}
                        value={field.value || ''}
                       >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEX_OPTIONS.map(option => (
                            <SelectItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
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
                        {TRAINING_EXPERIENCE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
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
                        {ACTIVITY_LEVEL_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
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
                        {ATHLETE_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
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
                        {PRIMARY_GOAL_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
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

function ManageSubscriptionCard({ userProfile }: { userProfile: UserProfileSettings }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/create-customer-portal-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId: user.uid })
      });

      const responseData = await response.json();
      
      if (response.ok) {
        if (responseData.isManualSubscription) {
          toast({
            title: "Manual Subscription",
            description: "Your subscription was set up manually. Contact support for changes.",
            variant: "default",
          });
        } else {
          window.open(responseData.url, '_blank');
        }
      } else {
        if (responseData.error?.includes('No Stripe customer')) {
          toast({
            title: "No Stripe Customer",
            description: "Please upgrade to a paid plan to access subscription management.",
            variant: "default",
          });
        } else {
          throw new Error(responseData.error || 'Failed to create portal session');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any, label: string }> = {
      'active': { variant: 'default', label: 'Premium Active' },
      'canceled': { variant: 'secondary', label: 'Canceled' },
      'past_due': { variant: 'destructive', label: 'Past Due' },
      'none': { variant: 'outline', label: 'Free Plan' }
    };
    return statusMap[status] || statusMap['none'];
  };

  const statusInfo = getStatusBadge(userProfile?.subscription_status || 'none');

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center text-accent">
          <Crown className="mr-2 h-5 w-5" />
          Subscription Management
        </CardTitle>
        <CardDescription>
          Manage your subscription, update payment methods, or view billing history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Current Status:</span>
          <Badge variant={statusInfo.variant} className="font-medium">
            {statusInfo.label}
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleManageSubscription}
          disabled={isLoading}
          className="bg-accent hover:bg-accent/90 text-accent-foreground w-full"
        >
          <Crown className="mr-2 h-4 w-4" />
          {isLoading ? 'Opening...' : 'Manage Subscription'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function DeleteAccountCard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          password,
          confirmationText,
        }),
      });

      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: "Your account and all data have been permanently deleted.",
        });
        // Sign out and redirect
        await signOut();
        window.location.href = '/';
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Unable to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = password.length > 0 && confirmationText === 'DELETE';

  return (
    <>
      <Card className="border-destructive/20 bg-background">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Trash2 className="mr-2 h-5 w-5 text-muted-foreground" />
            Account Deletion
          </CardTitle>
          <CardDescription>
            Permanently remove your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive">This action is permanent</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All recipes, meal plans, and personal data deleted</li>
                  <li>• Active subscription automatically canceled</li>
                  <li>• Account cannot be recovered</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Delete Account - Final Warning
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently delete ALL your data and cancel your subscription. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ You will lose access to all recipes, meal plans, and account data forever.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Enter your password to confirm:
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="border-destructive/30 focus:border-destructive"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type "DELETE" to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE"
                className="border-destructive/30 focus:border-destructive"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!canDelete || isDeleting}
              className="flex-1"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UserInfoPage() {
  const { user } = useAuth();
  const { profile: userProfile, updateProfile, loading: isAppDataLoading } = useOptimizedProfile(user?.uid);
  
  const formProfile = useMemo(() => ({
    ...getDefaultUserProfile(user?.uid || ''),
    ...userProfile,
  }), [userProfile, user?.uid]);

  return (
    <PageWrapper title="User Information">
      {isAppDataLoading ? (
        <UserInfoPageSkeleton />
      ) : (
        <div className="space-y-8">
          <UserInfoForm userProfile={formProfile} updateProfile={updateProfile} />
          
          <div className="grid gap-6">
            <ManageSubscriptionCard userProfile={formProfile} />
            <DeleteAccountCard />
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
