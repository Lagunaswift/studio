
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, Target, Edit } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { MacroTargets, Macros } from '@/types';
import { Progress } from '@/components/ui/progress';

const macroTargetSchema = z.object({
  calories: z.coerce.number().min(0, "Calories must be positive"),
  protein: z.coerce.number().min(0, "Protein must be positive"),
  carbs: z.coerce.number().min(0, "Carbs must be positive"),
  fat: z.coerce.number().min(0, "Fat must be positive"),
});

type MacroTargetFormValues = z.infer<typeof macroTargetSchema>;

export default function HomePage() {
  const { getDailyMacros, macroTargets, setMacroTargets, mealPlan } = useAppContext();
  const { toast } = useToast();
  
  const [clientTodayDate, setClientTodayDate] = useState<string>('');
  const [clientTodayMacros, setClientTodayMacros] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [showSetTargetsDialog, setShowSetTargetsDialog] = useState(false);

  useEffect(() => {
    setClientTodayDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    if (clientTodayDate && getDailyMacros) {
      setClientTodayMacros(getDailyMacros(clientTodayDate));
    }
  }, [clientTodayDate, getDailyMacros, mealPlan]);

  const features = [
    {
      title: 'Browse Recipes',
      description: 'Discover delicious and healthy recipes.',
      href: '/recipes',
      icon: UtensilsCrossed,
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    {
      title: 'Plan Your Meals',
      description: 'Organize your weekly meals and track nutrition.',
      href: '/meal-plan',
      icon: CalendarDays,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-600'
    },
    {
      title: 'AI Meal Suggestions',
      description: 'Get personalized meal plans from our AI.',
      href: '/ai-suggestions',
      icon: Sparkles,
      bgColor: 'bg-accent/10',
      iconColor: 'text-accent'
    },
    {
      title: 'Shopping List',
      description: 'Automated shopping lists based on your meal plan.',
      href: '/shopping-list',
      icon: ShoppingBag,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-600'
    },
  ];

  const macroTargetForm = useForm<MacroTargetFormValues>({
    resolver: zodResolver(macroTargetSchema),
    defaultValues: macroTargets || { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  });

  const proteinValue = macroTargetForm.watch("protein");
  const carbsValue = macroTargetForm.watch("carbs");
  const fatValue = macroTargetForm.watch("fat");

  useEffect(() => {
    const protein = parseFloat(proteinValue as any) || 0;
    const carbs = parseFloat(carbsValue as any) || 0;
    const fat = parseFloat(fatValue as any) || 0;

    const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    macroTargetForm.setValue("calories", Math.round(calculatedCalories), { shouldValidate: true, shouldDirty: true });
  }, [proteinValue, carbsValue, fatValue, macroTargetForm.setValue]);


  useEffect(() => {
    if (showSetTargetsDialog) {
      if (macroTargets) {
        macroTargetForm.reset(macroTargets);
      } else {
        // Initial default values, calories will be auto-calculated by the effect above
        macroTargetForm.reset({ calories: 0, protein: 150, carbs: 200, fat: 60 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroTargets, showSetTargetsDialog, macroTargetForm.reset]);

  const handleSetTargets: SubmitHandler<MacroTargetFormValues> = (data) => {
    setMacroTargets(data);
    toast({
      title: "Targets Updated",
      description: "Your macro targets have been saved.",
    });
    setShowSetTargetsDialog(false);
  };

  const macroKeys: (keyof MacroTargets)[] = ['calories', 'protein', 'carbs', 'fat'];

  return (
    <PageWrapper>
      <section className="text-center mb-12 py-8 bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 text-primary">
          Welcome to MealPlanner<span className="text-accent">Pro</span>
        </h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
          Your personal assistant for healthy eating. Plan meals, track macros, get AI suggestions, and simplify your shopping.
        </p>
      </section>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold font-headline text-primary">
            Today's Macros ({clientTodayDate ? format(parseISO(clientTodayDate), "MMMM dd, yyyy") : 'Loading...'})
          </h2>
          <Button variant="outline" onClick={() => setShowSetTargetsDialog(true)}>
            {macroTargets ? <Edit className="mr-2 h-4 w-4" /> : <Target className="mr-2 h-4 w-4" />}
            {macroTargets ? "Update Targets" : "Set Targets"}
          </Button>
        </div>

        {macroTargets ? (
          <Card className="shadow-md">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {macroKeys.map(key => {
                const consumed = clientTodayMacros[key as keyof typeof clientTodayMacros] ?? 0;
                const target = macroTargets[key] ?? 0;
                const progress = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
                const unit = key === 'calories' ? 'kcal' : 'g';
                const macroName = key.charAt(0).toUpperCase() + key.slice(1);

                return (
                  <div key={key}>
                    <div className="flex justify-between items-baseline mb-1">
                      <Label htmlFor={`progress-${key}`} className="text-base font-medium text-foreground/90">{macroName}</Label>
                      <span className="text-sm text-muted-foreground">
                        {consumed.toFixed(0)} / {target.toFixed(0)} {unit}
                      </span>
                    </div>
                    <Progress id={`progress-${key}`} value={progress} className="w-full h-3" aria-label={`${macroName} progress: ${progress.toFixed(0)}%`} />
                     {consumed > target && target > 0 && (
                        <p className="text-xs text-destructive mt-1">
                          Over by {(consumed - target).toFixed(0)} {unit}
                        </p>
                      )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <p className="text-foreground/70 mb-4">Set your daily macro targets to track your progress!</p>
              <Button onClick={() => setShowSetTargetsDialog(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Target className="mr-2 h-4 w-4" /> Set Targets Now
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline text-primary mb-6">Explore Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
              <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pb-2", feature.bgColor)}>
                <CardTitle className="text-lg font-semibold font-headline">{feature.title}</CardTitle>
                <feature.icon className={cn("h-6 w-6", feature.iconColor)} />
              </CardHeader>
              <CardContent className="pt-4">
                <CardDescription>{feature.description}</CardDescription>
                <Button asChild className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href={feature.href}>
                    Go to {feature.title.split(' ')[0]}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={showSetTargetsDialog} onOpenChange={setShowSetTargetsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-primary">Set Your Daily Macro Targets</DialogTitle>
            <DialogDescription>Enter your desired daily intake for calories and macronutrients. Calories will be auto-calculated.</DialogDescription>
          </DialogHeader>
          <form onSubmit={macroTargetForm.handleSubmit(handleSetTargets)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="protein">Protein (g)</Label>
              <Input id="protein" type="number" min="0" {...macroTargetForm.register("protein")} />
              {macroTargetForm.formState.errors.protein && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.protein.message}</p>}
            </div>
            <div>
              <Label htmlFor="carbs">Carbohydrates (g)</Label>
              <Input id="carbs" type="number" min="0" {...macroTargetForm.register("carbs")} />
              {macroTargetForm.formState.errors.carbs && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.carbs.message}</p>}
            </div>
            <div>
              <Label htmlFor="fat">Fat (g)</Label>
              <Input id="fat" type="number" min="0" {...macroTargetForm.register("fat")} />
              {macroTargetForm.formState.errors.fat && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.fat.message}</p>}
            </div>
            <div>
              <Label htmlFor="calories">Calories (kcal)</Label>
              <Input id="calories" type="number" min="0" {...macroTargetForm.register("calories")} />
              {macroTargetForm.formState.errors.calories && <p className="text-sm text-destructive mt-1">{macroTargetForm.formState.errors.calories.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSetTargetsDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Targets</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
