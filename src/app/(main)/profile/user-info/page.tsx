
"use client";

import { useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfileSettings, Sex, ActivityLevel, AthleteType, PrimaryGoal } from '@/types';
import { SEX_OPTIONS, ACTIVITY_LEVEL_OPTIONS, ATHLETE_TYPE_OPTIONS, PRIMARY_GOAL_OPTIONS } from '@/types';
import { Save, Calculator, Activity, UserCircle, Target as TargetIcon, Dumbbell } from 'lucide-react'; // Added TargetIcon, Dumbbell

const userInfoSchema = z.object({
  heightCm: z.coerce.number().min(50, "Height must be at least 50cm").max(300, "Height must be at most 300cm").nullable().optional(),
  weightKg: z.coerce.number().min(20, "Weight must be at least 20kg").max(500, "Weight must be at most 500kg").nullable().optional(),
  age: z.coerce.number().min(1, "Age must be at least 1").max(120, "Age must be at most 120").nullable().optional(),
  sex: z.enum(SEX_OPTIONS).nullable().optional(),
  activityLevel: z.enum(ACTIVITY_LEVEL_OPTIONS.map(o => o.value) as [ActivityLevel, ...ActivityLevel[]]).nullable().optional(),
  bodyFatPercentage: z.coerce.number().min(1, "Body fat % must be at least 1").max(70, "Body fat % must be at most 70").nullable().optional(),
  athleteType: z.enum(ATHLETE_TYPE_OPTIONS.map(o => o.value) as [AthleteType, ...AthleteType[]]).nullable().optional(),
  primaryGoal: z.enum(PRIMARY_GOAL_OPTIONS.map(o => o.value) as [PrimaryGoal, ...PrimaryGoal[]]).nullable().optional(),
});

type UserInfoFormValues = Pick<UserProfileSettings, 'heightCm' | 'weightKg' | 'age' | 'sex' | 'activityLevel' | 'bodyFatPercentage' | 'athleteType' | 'primaryGoal'>;

export default function UserInfoPage() {
  const { userProfile, setUserInformation } = useAppContext();
  const { toast } = useToast();

  const form = useForm<UserInfoFormValues>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      heightCm: userProfile?.heightCm || null,
      weightKg: userProfile?.weightKg || null,
      age: userProfile?.age || null,
      sex: userProfile?.sex || null,
      activityLevel: userProfile?.activityLevel || null,
      bodyFatPercentage: userProfile?.bodyFatPercentage || null,
      athleteType: userProfile?.athleteType || 'notSpecified',
      primaryGoal: userProfile?.primaryGoal || 'notSpecified',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        heightCm: userProfile.heightCm,
        weightKg: userProfile.weightKg,
        age: userProfile.age,
        sex: userProfile.sex,
        activityLevel: userProfile.activityLevel,
        bodyFatPercentage: userProfile.bodyFatPercentage,
        athleteType: userProfile.athleteType,
        primaryGoal: userProfile.primaryGoal,
      });
    }
  }, [userProfile, form]);

  const onSubmit: SubmitHandler<UserInfoFormValues> = (data) => {
    setUserInformation(data);
    toast({
      title: "User Information Saved",
      description: "Your profile details have been updated.",
    });
  };

  const { tdee, leanBodyMassKg } = userProfile || {};

  return (
    <PageWrapper title="User Information">
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><UserCircle className="mr-2 h-5 w-5 text-accent"/> Your Details</CardTitle>
            <CardDescription>
              Provide your physical attributes, activity level, and goals to help personalize your experience.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="heightCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age (years)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
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
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="bodyFatPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Fat % (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 15.5" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="activityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Activity className="mr-2 h-4 w-4 text-muted-foreground"/> Activity Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
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
                  )}
                />
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="athleteType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Dumbbell className="mr-2 h-4 w-4 text-muted-foreground"/> Athlete Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'notSpecified'}>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primaryGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><TargetIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Primary Goal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'notSpecified'}>
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
                    )}
                  />
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
              Based on your inputs. These help in setting macro targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Estimated TDEE (Total Daily Energy Expenditure)</h3>
              <p className="text-2xl font-bold text-primary">
                {tdee ? `${tdee.toLocaleString()} kcal/day` : 'N/A'}
              </p>
              {!tdee && <p className="text-xs text-muted-foreground">Requires height, weight, age, sex, and activity level.</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Estimated Lean Body Mass (LBM)</h3>
              <p className="text-2xl font-bold text-primary">
                {leanBodyMassKg ? `${leanBodyMassKg.toFixed(1)} kg` : 'N/A'}
              </p>
              {!leanBodyMassKg && <p className="text-xs text-muted-foreground">Requires weight and body fat %.</p>}
            </div>
             {(!tdee || !leanBodyMassKg) && userProfile && (userProfile.heightCm && userProfile.weightKg && userProfile.age && userProfile.sex && userProfile.activityLevel && (userProfile.bodyFatPercentage || leanBodyMassKg === null )) &&
                <p className="text-xs text-muted-foreground pt-4">Make sure all required fields are filled to see estimates.</p>
            }
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
