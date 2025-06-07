"use client";

import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, BarChart3, TrendingUp } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { MacroDisplay } from '@/components/shared/MacroDisplay';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { getDailyMacros } = useAppContext();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayMacros = getDailyMacros(today);

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

  return (
    <PageWrapper>
      <section className="text-center mb-12 py-8 bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 text-primary">
          Welcome to Macro<span className="text-accent">Teal</span> Planner
        </h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
          Your personal assistant for healthy eating. Plan meals, track macros, get AI suggestions, and simplify your shopping.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold font-headline text-primary mb-4">Today's Macros ({format(parseISO(today), "MMMM dd, yyyy")})</h2>
        {todayMacros.calories > 0 || todayMacros.protein > 0 || todayMacros.carbs > 0 || todayMacros.fat > 0 ? (
          <MacroDisplay macros={todayMacros} title="Today's Totals" highlightTotal />
        ) : (
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <p className="text-foreground/70">No meals planned for today yet. <Link href="/meal-plan" className="text-primary hover:underline">Plan your meals now!</Link></p>
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
    </PageWrapper>
  );
}
