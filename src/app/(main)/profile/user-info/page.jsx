"use client";
import { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SEX_OPTIONS, ACTIVITY_LEVEL_OPTIONS, ATHLETE_TYPE_OPTIONS, PRIMARY_GOAL_OPTIONS, TRAINING_EXPERIENCE_OPTIONS } from '@/types';
import { Save, Calculator, Activity, UserCircle, Target as TargetIcon, Dumbbell, Mail, User as UserIcon, Ruler, Scale, Award } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Helper function (can be moved to utils if used elsewhere)
const calculateNavyBodyFatPercentage = (sex, heightCm, neckCm, abdomenCm, waistCm, hipCm) => {
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
        }
        else if (sex === 'female') {
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
    }
    catch (error) {
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
    sex: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Please select a sex.' }) }).nullable(),
    activityLevel: z.enum(ACTIVITY_LEVEL_OPTIONS.map(o => o.value)).nullable().optional(),
    training_experience_level: z.enum(TRAINING_EXPERIENCE_OPTIONS.map(o => o.value)).nullable().optional(),
    bodyFatPercentage: z.coerce.number().min(1, "Body fat % must be at least 1").max(70, "Body fat % must be at most 70").nullable().optional(),
    athleteType: z.enum(ATHLETE_TYPE_OPTIONS.map(o => o.value)).nullable().optional(),
    primaryGoal: z.enum(PRIMARY_GOAL_OPTIONS.map(o => o.value)).nullable().optional(),
    neck_circumference_cm: z.coerce.number().min(1, "Neck circumference must be positive").nullable().optional(),
    abdomen_circumference_cm: z.coerce.number().min(1, "Abdomen circumference must be positive").nullable().optional(), // Male
    waist_circumference_cm: z.coerce.number().min(1, "Waist circumference must be positive").nullable().optional(), // Female
    hip_circumference_cm: z.coerce.number().min(1, "Hip circumference must be positive").nullable().optional(), // Female
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
    path: ["hip_circumference_cm"], // Or waist_circumference_cm
});
export default function UserInfoPage() {
    const { userProfile, setUserInformation } = useAppContext();
    const { toast } = useToast();
    const [calculationMessage, setCalculationMessage] = useState(null);
    const [calculationError, setCalculationError] = useState(false);
    const form = useForm({
        resolver: zodResolver(userInfoSchema),
        defaultValues: {
            name: userProfile?.name || null,
            email: userProfile?.email || null,
            heightCm: userProfile?.heightCm || null,
            weightKg: userProfile?.weightKg || null,
            age: userProfile?.age || null,
            sex: userProfile?.sex === 'notSpecified' ? null : userProfile?.sex,
            activityLevel: userProfile?.activityLevel || null,
            training_experience_level: userProfile?.training_experience_level || null,
            bodyFatPercentage: userProfile?.bodyFatPercentage || null,
            athleteType: userProfile?.athleteType || 'notSpecified',
            primaryGoal: userProfile?.primaryGoal || 'notSpecified',
            neck_circumference_cm: userProfile?.neck_circumference_cm || null,
            abdomen_circumference_cm: userProfile?.abdomen_circumference_cm || null,
            waist_circumference_cm: userProfile?.waist_circumference_cm || null,
            hip_circumference_cm: userProfile?.hip_circumference_cm || null,
        },
    });
    const watchedSex = form.watch("sex");
    useEffect(() => {
        if (userProfile) {
            form.reset({
                name: userProfile.name || null,
                email: userProfile.email || null,
                heightCm: userProfile.heightCm || null,
                weightKg: userProfile.weightKg || null,
                age: userProfile.age || null,
                sex: userProfile.sex === 'notSpecified' ? null : userProfile.sex,
                activityLevel: userProfile.activityLevel || null,
                training_experience_level: userProfile.training_experience_level || null,
                bodyFatPercentage: userProfile.bodyFatPercentage || null,
                athleteType: userProfile.athleteType || 'notSpecified',
                primaryGoal: userProfile.primaryGoal || 'notSpecified',
                neck_circumference_cm: userProfile.neck_circumference_cm || null,
                abdomen_circumference_cm: userProfile.abdomen_circumference_cm || null,
                waist_circumference_cm: userProfile.waist_circumference_cm || null,
                hip_circumference_cm: userProfile.hip_circumference_cm || null,
            });
        }
    }, [userProfile, form]);
    const onSubmit = (data) => {
        setUserInformation(data);
        toast({
            title: "User Information Saved",
            description: "Your profile details have been updated.",
        });
        form.reset(data, { keepDirty: false, keepValues: true });
    };
    const handleCalculateBodyFat = () => {
        setCalculationMessage(null);
        setCalculationError(false);
        const { heightCm, sex, neck_circumference_cm, abdomen_circumference_cm, waist_circumference_cm, hip_circumference_cm } = form.getValues();
        if (!sex || !heightCm || !neck_circumference_cm) {
            setCalculationMessage("Sex, Height, and Neck circumference are required for body fat calculation.");
            setCalculationError(true);
            toast({ title: "Missing Information", description: "Sex, Height, and Neck circumference are required.", variant: "destructive" });
            return;
        }
        let calculatedBFP = null;
        if (sex === 'male') {
            if (!abdomen_circumference_cm) {
                setCalculationMessage("Abdomen circumference is required for male body fat calculation.");
                setCalculationError(true);
                toast({ title: "Missing Information", description: "Abdomen circumference is required for males.", variant: "destructive" });
                return;
            }
            if (abdomen_circumference_cm <= neck_circumference_cm) {
                setCalculationMessage("For males, abdomen circumference must be greater than neck circumference.");
                setCalculationError(true);
                toast({ title: "Invalid Measurements", description: "Abdomen must be greater than neck for males.", variant: "destructive" });
                return;
            }
        }
        else if (sex === 'female') {
            if (!waist_circumference_cm || !hip_circumference_cm) {
                setCalculationMessage("Waist and Hip circumferences are required for female body fat calculation.");
                setCalculationError(true);
                toast({ title: "Missing Information", description: "Waist and Hip circumferences are required for females.", variant: "destructive" });
                return;
            }
            if ((waist_circumference_cm + hip_circumference_cm) <= neck_circumference_cm) {
                setCalculationMessage("For females, (Waist + Hip) must be greater than Neck circumference.");
                setCalculationError(true);
                toast({ title: "Invalid Measurements", description: "For females, (Waist + Hip) must be > Neck.", variant: "destructive" });
                return;
            }
        }
        calculatedBFP = calculateNavyBodyFatPercentage(sex, heightCm, neck_circumference_cm, abdomen_circumference_cm, waist_circumference_cm, hip_circumference_cm);
        if (calculatedBFP !== null && !isNaN(calculatedBFP)) {
            form.setValue("bodyFatPercentage", parseFloat(calculatedBFP.toFixed(1)), { shouldValidate: true, shouldDirty: true });
            setCalculationMessage(`Estimated Body Fat: ${calculatedBFP.toFixed(1)}%. This value has been updated in the form.`);
            setCalculationError(false);
            toast({ title: "Body Fat Calculated", description: `Estimated at ${calculatedBFP.toFixed(1)}%. You can now save your profile.` });
        }
        else {
            setCalculationMessage("Could not calculate body fat percentage. Please check your measurements. Ensure abdomen > neck (males) or waist + hip > neck (females).");
            setCalculationError(true);
            toast({ title: "Calculation Error", description: "Please check measurements. Abdomen > Neck (M), Waist + Hip > Neck (F).", variant: "destructive" });
        }
    };
    const { tdee, leanBodyMassKg } = userProfile || {};
    return (<PageWrapper title="User Information">
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
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><UserIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Name</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Your Name" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>)}/>
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>)}/>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="heightCm" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><Ruler className="mr-2 h-4 w-4 text-muted-foreground"/>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>)}/>
                  <FormField control={form.control} name="weightKg" render={({ field }) => (<FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>)}/>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="age" render={({ field }) => (<FormItem>
                        <FormLabel>Age (years)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>)}/>
                   <FormField control={form.control} name="sex" render={({ field }) => (<FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Controller name="sex" control={form.control} render={({ field: controllerField }) => (<Select onValueChange={(value) => {
                    controllerField.onChange(value);
                    // Reset gender-specific fields when sex changes
                    if (value === 'male') {
                        form.setValue('waist_circumference_cm', null, { shouldValidate: true });
                        form.setValue('hip_circumference_cm', null, { shouldValidate: true });
                    }
                    else if (value === 'female') {
                        form.setValue('abdomen_circumference_cm', null, { shouldValidate: true });
                    }
                }} value={controllerField.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sex"/>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SEX_OPTIONS.map(option => (<SelectItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</SelectItem>))}
                              </SelectContent>
                            </Select>)}/>
                        <FormMessage />
                      </FormItem>)}/>
                </div>
                 <div className="grid sm:grid-cols-2 gap-6">
                   <FormField control={form.control} name="training_experience_level" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><Award className="mr-2 h-4 w-4 text-muted-foreground"/>Training Experience</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'notSpecified'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your training level"/>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRAINING_EXPERIENCE_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>)}/>
                  <FormField control={form.control} name="activityLevel" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><Activity className="mr-2 h-4 w-4 text-muted-foreground"/> Activity Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity level"/>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ACTIVITY_LEVEL_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>)}/>
                 </div>

                <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                    <h4 className="text-md font-semibold text-primary flex items-center mb-3">
                        <Scale className="mr-2 h-5 w-5 text-accent"/> Body Measurements (for optional Body Fat % calc)
                    </h4>
                    <FormField control={form.control} name="neck_circumference_cm" render={({ field }) => (<FormItem>
                            <FormLabel>Neck Circumference (cm)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 38.5" {...field} value={field.value ?? ""}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>)}/>
                    {watchedSex === 'male' && (<FormField control={form.control} name="abdomen_circumference_cm" render={({ field }) => (<FormItem>
                                <FormLabel>Abdomen Circumference (cm)</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.1" placeholder="e.g., 90.0 (at navel level)" {...field} value={field.value ?? ""}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>)}/>)}
                    {watchedSex === 'female' && (<>
                        <FormField control={form.control} name="waist_circumference_cm" render={({ field }) => (<FormItem>
                                <FormLabel>Waist Circumference (cm)</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.1" placeholder="e.g., 70.0 (narrowest point)" {...field} value={field.value ?? ""}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>)}/>
                        <FormField control={form.control} name="hip_circumference_cm" render={({ field }) => (<FormItem>
                                <FormLabel>Hip Circumference (cm)</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.1" placeholder="e.g., 95.0 (widest point)" {...field} value={field.value ?? ""}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>)}/>
                        </>)}
                    <Button type="button" variant="outline" onClick={handleCalculateBodyFat} className="mt-2 w-full sm:w-auto">
                        <Calculator className="mr-2 h-4 w-4 text-accent"/> Calculate Body Fat % (Navy Method)
                    </Button>
                    {calculationMessage && (<Alert variant={calculationError ? "destructive" : "default"} className="mt-2">
                            <AlertTitle>{calculationError ? "Error" : "Info"}</AlertTitle>
                            <AlertDescription>{calculationMessage}</AlertDescription>
                        </Alert>)}
                </div>


                <FormField control={form.control} name="bodyFatPercentage" render={({ field }) => (<FormItem>
                      <FormLabel>Body Fat % (Direct Entry or Calculated)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 15.5" {...field} value={field.value ?? ""}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>)}/>
                 
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="athleteType" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><Dumbbell className="mr-2 h-4 w-4 text-muted-foreground"/> Athlete Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'notSpecified'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select athlete type"/>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ATHLETE_TYPE_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>)}/>
                  <FormField control={form.control} name="primaryGoal" render={({ field }) => (<FormItem>
                        <FormLabel className="flex items-center"><TargetIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Primary Goal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'notSpecified'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select primary goal"/>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIMARY_GOAL_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>)}/>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Save className="mr-2 h-4 w-4"/> {form.formState.isSubmitting ? "Saving..." : "Save Information"}
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
                {userProfile?.tdee ? `${userProfile.tdee.toLocaleString()} kcal/day` : 'N/A'}
              </p>
              {!userProfile?.tdee && <p className="text-xs text-muted-foreground mt-1">Requires height, weight, age, sex, and activity level.</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Estimated Lean Body Mass (LBM)</h3>
              <p className="text-2xl font-bold text-primary">
                {userProfile?.leanBodyMassKg ? `${userProfile.leanBodyMassKg.toFixed(1)} kg` : 'N/A'}
              </p>
              {!userProfile?.leanBodyMassKg && <p className="text-xs text-muted-foreground mt-1">Requires weight and body fat %.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>);
}
