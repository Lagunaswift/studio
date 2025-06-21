"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import type { DashboardSettings } from '@/types';
import { Save, SlidersHorizontal } from 'lucide-react';

const dashboardSettingsSchema = z.object({
  showMacros: z.boolean().default(true),
  showMenu: z.boolean().default(true),
  showFeaturedRecipe: z.boolean().default(true),
  showQuickRecipes: z.boolean().default(true),
});

type DashboardSettingsFormValues = z.infer<typeof dashboardSettingsSchema>;

export default function DashboardSettingsPage() {
  const { userProfile, setDashboardSettings } = useAppContext();
  const { toast } = useToast();

  const form = useForm<DashboardSettingsFormValues>({
    resolver: zodResolver(dashboardSettingsSchema),
    defaultValues: userProfile?.dashboardSettings || {
      showMacros: true,
      showMenu: true,
      showFeaturedRecipe: true,
      showQuickRecipes: true,
    },
  });

  useEffect(() => {
    if (userProfile?.dashboardSettings) {
      form.reset(userProfile.dashboardSettings);
    }
  }, [userProfile?.dashboardSettings, form]);

  const onSubmit: SubmitHandler<DashboardSettingsFormValues> = (data) => {
    setDashboardSettings(data as DashboardSettings);
    toast({
      title: "Dashboard Settings Saved",
      description: "Your dashboard preferences have been updated.",
    });
    form.reset(data); // Reset form with saved data to clear dirty state
  };

  return (
    <PageWrapper title="Dashboard Customization">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <SlidersHorizontal className="mr-2 h-5 w-5 text-accent" />
            Customize Your Dashboard
          </CardTitle>
          <CardDescription>
            Choose which widgets you want to see on your dashboard.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              <FormField
                control={form.control}
                name="showMacros"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Today's Macros</FormLabel>
                      <CardDescription>Show the chart tracking your daily macro intake against your targets.</CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showMenu"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Today's Menu</FormLabel>
                      <CardDescription>Display the list of meals you've planned for today.</CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showFeaturedRecipe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Featured Recipe</FormLabel>
                      <CardDescription>Showcase a random recipe from your collection for inspiration.</CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showQuickRecipes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Quick & Easy Meals</FormLabel>
                      <CardDescription>Display a scrollable list of quick-to-prepare recipes.</CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </PageWrapper>
  );
}
