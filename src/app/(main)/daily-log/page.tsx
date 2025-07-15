
"use client";

import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Scale, Save, Loader2, BrainCircuit, CheckCircle2, TrendingUp, Edit, CalculatorIcon } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { DailyVitalsLog, EnergyLevelV2, SorenessLevel, ActivityYesterdayLevel, Macros } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";


const weightLogSchema = z.object({
  weightKg: z.coerce.number().positive("Weight must be a positive number.").min(20, "Weight must be at least 20kg").max(500, "Weight must be at most 500kg"),
});
type WeightLogFormValues = z.infer<typeof weightLogSchema>;

const manualMacroLogSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be non-negative."),
  protein: z.coerce.number().min(0, "Protein must be non-negative."),
  carbs: z.coerce.number().min(0, "Carbs must be non-negative."),
  fat: z.coerce.number().min(0, "Fat must be non-negative."),
});
type ManualMacroLogFormValues = z.infer<typeof manualMacroLogSchema>;

const vitalsSchema = z.object({
  sleepQuality: z.coerce.number().min(1).max(10),
  energyLevel: z.enum(['low', 'moderate', 'high', 'vibrant']),
  cravingsLevel: z.coerce.number().min(1).max(10),
  muscleSoreness: z.enum(['none', 'mild', 'moderate', 'severe']),
  activityYesterday: z.enum(['rest', 'light', 'moderate', 'strenuous']),
  notes: z.string().max(500, "Notes must be under 500 characters.").optional(),
});
type VitalsFormValues = z.infer<typeof vitalsSchema>;

function DailyVitalsCheckin() {
  const { userProfile, logVitals } = useAppContext();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const clientTodayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  
  const todayLog = useMemo(() => 
    userProfile?.dailyVitalsLog?.find(log => log.date === clientTodayDate),
    [userProfile?.dailyVitalsLog, clientTodayDate]
  );
  
  const form = useForm<VitalsFormValues>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      sleepQuality: todayLog?.sleepQuality || 7,
      energyLevel: todayLog?.energyLevel || 'moderate',
      cravingsLevel: todayLog?.cravingsLevel || 5,
      muscleSoreness: todayLog?.muscleSoreness || 'none',
      activityYesterday: todayLog?.activityYesterday || 'light',
      notes: todayLog?.notes || ''
    }
  });
  
  useEffect(() => {
    if (todayLog) {
      form.reset(todayLog);
    }
  }, [todayLog, form]);

  const onSubmit: SubmitHandler<VitalsFormValues> = async (data) => {
    await logVitals(clientTodayDate, data);
    toast({
      title: "Vitals Logged",
      description: "Your daily vitals have been saved. Preppy will use this to provide better insights!",
    });
    setIsOpen(false);
  };

  const energyOptions: { value: EnergyLevelV2, label: string }[] = [
    { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' }, { value: 'vibrant', label: 'Vibrant' },
  ];
  
  const sorenessOptions: { value: SorenessLevel, label: string }[] = [
    { value: 'none', label: 'None' }, { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe (DOMS)' },
  ];
  
  const activityOptions: { value: ActivityYesterdayLevel, label: string }[] = [
    { value: 'rest', label: 'Rest Day' }, { value: 'light', label: 'Light Activity (e.g., walk)' },
    { value: 'moderate', label: 'Moderate Exercise (e.g., gym)' }, { value: 'strenuous', label: 'Strenuous Exercise (e.g., HIIT)' },
  ];

  if (todayLog) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-headline text-primary flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" /> Daily Vitals Logged
          </CardTitle>
          <CardDescription>You're all checked in for today. Great job!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Sleep:</strong> {todayLog.sleepQuality}/10</p>
            <p><strong>Energy:</strong> <span className="capitalize">{todayLog.energyLevel}</span></p>
            <p><strong>Recovery:</strong> <span className="capitalize">{todayLog.muscleSoreness}</span></p>
        </CardContent>
        <CardFooter>
           <Button variant="outline" onClick={() => setIsOpen(true)}>Edit Today's Vitals</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-headline text-primary flex items-center">
            <BrainCircuit className="mr-2 h-5 w-5 text-accent" /> Log Today's Vitals
          </CardTitle>
          <CardDescription>Check in daily to help Preppy provide smarter coaching.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">Log how you feel today to track trends and get better insights.</p>
        </CardContent>
        <CardFooter>
          <DialogTrigger asChild>
            <Button className="w-full">Log Vitals</Button>
          </DialogTrigger>
        </CardFooter>
      </Card>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daily Vitals Check-in</DialogTitle>
          <DialogDescription>
            Take a moment to reflect on your sleep, energy, and recovery.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
             <FormField
                control={form.control}
                name="sleepQuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sleep Quality (1-10)</FormLabel>
                    <FormControl>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">Restless</span>
                            <Controller
                                name="sleepQuality"
                                control={form.control}
                                render={({ field: controllerField }) => (
                                    <Slider
                                        defaultValue={[controllerField.value]}
                                        onValueChange={(value) => controllerField.onChange(value[0])}
                                        max={10} min={1} step={1}
                                        className="flex-1"
                                    />
                                )}
                            />
                            <span className="text-xs text-muted-foreground">Perfect</span>
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
            <FormField
              control={form.control}
              name="energyLevel"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Morning Energy Level</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      {energyOptions.map(opt => (
                        <FormItem key={opt.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={opt.value} />
                          </FormControl>
                          <FormLabel className="font-normal">{opt.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cravingsLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appetite / Cravings (1-10)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">None</span>
                        <Controller
                            name="cravingsLevel"
                            control={form.control}
                            render={({ field: controllerField }) => (
                                <Slider
                                    defaultValue={[controllerField.value]}
                                    onValueChange={(value) => controllerField.onChange(value[0])}
                                    max={10} min={1} step={1}
                                    className="flex-1"
                                />
                            )}
                        />
                        <span className="text-xs text-muted-foreground">Ravenous</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="muscleSoreness"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Muscle Soreness / Recovery</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      {sorenessOptions.map(opt => (
                        <FormItem key={opt.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={opt.value} />
                          </FormControl>
                          <FormLabel className="font-normal">{opt.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="activityYesterday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yesterday's Activity Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>General Notes / Thoughts (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Felt bloated after dinner, stressed from work..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Log Vitals
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function DailyWeightLog() {
    const { userProfile, logWeight } = useAppContext();
    const { toast } = useToast();
    const [clientTodayDate, setClientTodayDate] = useState<string>('');

    useEffect(() => {
        setClientTodayDate(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    const weightLogForm = useForm<WeightLogFormValues>({
        resolver: zodResolver(weightLogSchema),
        defaultValues: {
            weightKg: userProfile?.weightKg || ''
        }
    });

    useEffect(() => {
        if (userProfile) {
            weightLogForm.reset({ weightKg: userProfile.weightKg || '' });
        }
    }, [userProfile, weightLogForm]);

    const handleLogWeight: SubmitHandler<WeightLogFormValues> = async (data) => {
        if (clientTodayDate) {
            await logWeight(clientTodayDate, data.weightKg);
            toast({
                title: "Weight Logged",
                description: `Weight of ${data.weightKg}kg logged for today.`,
            });
        }
    };
    
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="text-xl font-bold font-headline text-primary flex items-center">
                    <Scale className="mr-2 h-5 w-5 text-accent" /> Daily Weight Log
                </CardTitle>
                <CardDescription>Log your weight to track your progress trend.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...weightLogForm}>
                    <form onSubmit={weightLogForm.handleSubmit(handleLogWeight)} className="space-y-4">
                        <FormField
                        control={weightLogForm.control}
                        name="weightKg"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Today's Weight (kg)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.1" placeholder="e.g., 70.5" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={weightLogForm.formState.isSubmitting}>
                            <Save className="mr-2 h-4 w-4"/> Log Weight
                        </Button>
                    </form>
                </Form>
                <div className="mt-6">
                    <h4 className="font-semibold mb-2 text-muted-foreground">Recent Entries:</h4>
                    {userProfile?.dailyWeightLog && userProfile.dailyWeightLog.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                            {userProfile.dailyWeightLog.slice(0, 7).map(log => (
                                <li key={log.date} className="flex justify-between p-2 bg-muted/30 rounded-md">
                                    <span>{format(parseISO(log.date), 'dd MMMM, yyyy')}</span>
                                    <span className="font-semibold">{log.weightKg} kg</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No weight entries yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function ManualMacroLog() {
    const { userProfile, logManualMacros } = useAppContext();
    const { toast } = useToast();
    const clientTodayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    const todayLog = useMemo(() => 
        userProfile?.dailyManualMacrosLog?.find(log => log.date === clientTodayDate)?.macros,
        [userProfile?.dailyManualMacrosLog, clientTodayDate]
    );

    const form = useForm<ManualMacroLogFormValues>({
        resolver: zodResolver(manualMacroLogSchema),
        defaultValues: todayLog || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });
    
    useEffect(() => {
        if (todayLog) {
            form.reset(todayLog);
        }
    }, [todayLog, form]);

    const onSubmit: SubmitHandler<ManualMacroLogFormValues> = async (data) => {
        await logManualMacros(clientTodayDate, data);
        toast({
            title: "Macros Logged",
            description: "Your manually entered macros have been saved for today.",
        });
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="text-xl font-bold font-headline text-primary flex items-center">
                    <CalculatorIcon className="mr-2 h-5 w-5 text-accent" /> Manually Log Macros
                </CardTitle>
                <CardDescription>Ate off-plan? Enter your totals here to keep the weekly check-in accurate.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="calories" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Calories</FormLabel>
                                    <FormControl><Input type="number" placeholder="kcal" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="protein" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Protein (g)</FormLabel>
                                    <FormControl><Input type="number" placeholder="grams" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="carbs" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Carbs (g)</FormLabel>
                                    <FormControl><Input type="number" placeholder="grams" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="fat" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fat (g)</FormLabel>
                                    <FormControl><Input type="number" placeholder="grams" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            <Save className="mr-2 h-4 w-4"/> {todayLog ? 'Update' : 'Log'} Daily Macros
                        </Button>
                    </form>
                </Form>
                 {todayLog && (
                    <div className="mt-4 text-center p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm">
                        <CheckCircle2 className="inline-block h-4 w-4 mr-2" />
                        You have already logged macros manually for today. Submitting again will overwrite the previous entry.
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}

function VitalsHistoryCharts() {
  const { userProfile } = useAppContext();
  
  const vitalsData = useMemo(() => {
    if (!userProfile?.dailyVitalsLog || userProfile.dailyVitalsLog.length === 0) {
      return [];
    }
    
    const last14Days = userProfile.dailyVitalsLog.slice(0, 14).reverse(); 

    const energyMap: Record<EnergyLevelV2, number> = { low: 1, moderate: 2, high: 3, vibrant: 4 };
    const sorenessMap: Record<SorenessLevel, number> = { none: 1, mild: 2, moderate: 3, severe: 4 };
    const activityMap: Record<ActivityYesterdayLevel, number> = { rest: 1, light: 2, moderate: 3, strenuous: 4 };

    return last14Days.map(log => ({
      date: format(parseISO(log.date), 'dd/MM'),
      ...log,
      energyValue: energyMap[log.energyLevel] || 0,
      sorenessValue: sorenessMap[log.muscleSoreness] || 0,
      activityValue: activityMap[log.activityYesterday] || 0,
    }));
  }, [userProfile?.dailyVitalsLog]);

  if (vitalsData.length < 2) {
    return (
      <Card className="mt-8 col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent" />Vitals History</CardTitle>
          <CardDescription>Log your vitals for a few more days to see your trends here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartConfig = {
    sleepQuality: { label: "Sleep Quality (1-10)", color: "hsl(var(--chart-1))" },
    cravingsLevel: { label: "Cravings (1-10)", color: "hsl(var(--chart-2))" },
    energyValue: { label: "Energy Level", color: "hsl(var(--chart-3))" },
    sorenessValue: { label: "Soreness", color: "hsl(var(--chart-4))" },
    activityValue: { label: "Activity", color: "hsl(var(--chart-5))" },
  } satisfies ChartConfig;

  return (
    <Card className="mt-8 col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent" />Your Vitals History (Last {vitalsData.length} Days)</CardTitle>
        <CardDescription>
          Visualize your daily check-in data to spot trends in your wellness.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Sleep & Cravings Trends</h3>
          <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <LineChart accessibilityLayer data={vitalsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={[0, 10]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line dataKey="sleepQuality" type="monotone" stroke="var(--color-sleepQuality)" strokeWidth={2} dot={true} name="Sleep Quality" />
              <Line dataKey="cravingsLevel" type="monotone" stroke="var(--color-cravingsLevel)" strokeWidth={2} dot={true} name="Cravings" />
            </LineChart>
          </ChartContainer>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Energy, Soreness & Activity Levels</h3>
           <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <BarChart accessibilityLayer data={vitalsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} tickFormatter={(value) => {
                  if (value === 1) return 'Low';
                  if (value === 2) return 'Med';
                  if (value === 3) return 'High';
                  if (value === 4) return 'Max';
                  return '';
              }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="energyValue" fill="var(--color-energyValue)" radius={4} name="Energy Level" />
              <Bar dataKey="sorenessValue" fill="var(--color-sorenessValue)" radius={4} name="Soreness" />
              <Bar dataKey="activityValue" fill="var(--color-activityValue)" radius={4} name="Activity" />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}


export default function DailyLogPage() {
    return (
        <PageWrapper title="Daily Log">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DailyWeightLog />
                <DailyVitalsCheckin />
                <ManualMacroLog />
                <VitalsHistoryCharts />
            </div>
        </PageWrapper>
    );
}
