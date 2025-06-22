
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  LayoutDashboard, UtensilsCrossed, CalendarDays, Sparkles, ShoppingBag, UserCog, Settings, Archive, BookOpen, AlertTriangle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface GuideSection {
  icon: LucideIcon;
  title: string;
  content: string[];
}

const sections: GuideSection[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard Overview",
    content: [
      "Your <strong>Dashboard</strong> is your daily snapshot.",
      "Here, you can see your <strong>Today's Macros</strong> progress against your targets. If you haven't set targets yet, you'll be prompted to do so. Accurate targets help the AI generate better meal plans.",
      "The dashboard also features a random <strong>Featured Recipe</strong> from your collection to inspire your next meal, and a summary of <strong>Today's Menu</strong> if you've planned meals for the current day."
    ]
  },
  {
    icon: UtensilsCrossed,
    title: "Managing Recipes",
    content: [
      "The <strong>Recipes</strong> page is where you'll find all your saved recipes.",
      "You can use the <strong>search bar</strong> to find recipes by name, description, or tags. You can also toggle to show only your <strong>favorited recipes</strong> using the switch next to the search bar.",
      "If you've set <a href='/profile/diet-type' class='text-accent underline hover:text-accent/80'>Dietary Preferences</a> or <a href='/profile/allergens' class='text-accent underline hover:text-accent/80'>Allergens</a> in your profile, recipes will be automatically filtered to match your needs.",
      "Click on any recipe card to view its <strong>full details</strong>, including ingredients, instructions, and macros per serving. From here, you can also mark a recipe as a favorite.",
      "From the recipe detail page, you can easily <strong>add the recipe to your Meal Plan</strong> for a specific date and meal type."
    ]
  },
  {
    icon: CalendarDays,
    title: "Planning Your Meals",
    content: [
      "The <strong>Meal Plan</strong> page is your interactive calendar.",
      "<strong>Select a date</strong> using the calendar view. You can navigate to previous or next days easily.",
      "For each meal slot (e.g., Breakfast, Lunch, Dinner, Snack), you'll see either a planned meal or a <strong>recipe picker</strong>.",
      "Use the arrows in the recipe picker to browse available recipes. Click the 'Add' button to assign a recipe to that slot for the selected date.",
      "Once a meal is planned, you can <strong>edit its servings</strong> or <strong>remove it</strong> from the plan.",
      "The <strong>Daily Totals</strong> card at the top shows your aggregated macros for the selected day, helping you stay on track."
    ]
  },
  {
    icon: Archive,
    title: "Managing Your Pantry",
    content: [
      "The <strong>Pantry</strong> page (accessible via the <Archive class='inline h-4 w-4 text-accent' /> icon in the sidebar) helps you keep track of ingredients you have on hand.",
      "<strong>Add items</strong> by entering the ingredient name, quantity, and unit from the dropdown. You can also specify an optional <strong>expiry date</strong> to help manage freshness.",
      "The <strong>Shopping List</strong> automatically considers your pantry items. If you have enough of an ingredient in your pantry (considering quantities), it won't be added to the shopping list, or the quantity needed will be reduced.",
      "Monitor items that are <strong>expiring soon</strong> or have already expired with helpful warnings at the top of the Pantry page. Each item in your pantry also displays its expiry date.",
      "Easily <strong>adjust quantities</strong> (using +/- buttons or direct input) or <strong>remove items</strong> as you use them."
    ]
  },
  {
    icon: Sparkles,
    title: "AI Meal Suggestions",
    content: [
      "Let our AI chef do the heavy lifting on the <strong>AI Suggestions</strong> page!",
      "<strong>Important:</strong> For the best suggestions, ensure your <a href='/profile/user-info' class='text-accent underline hover:text-accent/80'>Profile Settings</a> are complete, especially your Macro Targets, Meal Structure, Dietary Preferences, and Allergens.",
      "Click 'Generate My AI Meal Plan'. The AI will consider your profile and available recipes (from your recipe database) to create a balanced one-day meal plan.",
      "Review the AI's justification and the overall fitness assessment.",
      "If you like the plan, click <strong>'Add This Plan to My Calendar'</strong> to automatically populate your meal plan for the current day."
    ]
  },
  {
    icon: AlertTriangle,
    title: "Managing Allergies & Medical Diets",
    content: [
      "While our filters offer a convenient way to browse for lifestyle choices, we strongly recommend using the <strong>search bar and tag system</strong> for the most control over managing serious allergies, intolerances, or medical conditions.",
      "You can search for recipes that <em>do</em> contain an ingredient to exclude them, or review the specific #tags on each recipe. This, combined with carefully reading all ingredient labels on the final products, is the safest way to manage your specific needs.",
      "<strong>Disclaimer:</strong> This app is an informational tool, not a substitute for medical advice. You are fully responsible for managing your own dietary needs. Always double-check product labels."
    ]
  },
  {
    icon: ShoppingBag,
    title: "Automated Shopping List",
    content: [
      "The <strong>Shopping List</strong> is automatically generated based on the meals you've added to your Meal Plan, considering items you already have in your <strong>Pantry</strong>.",
      "View your list either <strong>By Aisle</strong> (grouped by supermarket category) or <strong>By Recipe</strong> (showing ingredients needed for each planned meal).",
      "As you add or remove meals, or update your pantry, the shopping list updates to reflect the required ingredients and their quantities.",
      "You can check off items as you purchase them. This status is synced across both views.",
      "If you need to start fresh, the 'Clear List & Plan' button will clear both your current shopping list and your entire meal plan."
    ]
  },
  {
    icon: UserCog,
    title: "Profile Settings Deep Dive",
    content: [
      "Keeping your <strong>Profile Settings</strong> up-to-date is key to personalizing your MealPlannerPro experience.",
      "<strong>User Info:</strong> Basic details like name, email, height, weight, age, sex, and activity level. This data helps calculate your TDEE (Total Daily Energy Expenditure) and LBM (Lean Body Mass), which can guide your macro targets. You can also input body measurements to estimate Body Fat % using the Navy method.",
      "<strong>Targets:</strong> Set your daily caloric and macronutrient (protein, carbs, fat) goals here. The AI can help suggest protein and fat intake based on your LBM, TDEE and goals.",
      "<strong>Diet Type:</strong> Specify preferences like Vegetarian, Vegan, etc. This influences recipe filtering and AI suggestions.",
      "<strong>Allergens:</strong> Mark common allergens to avoid. Recipes containing these will be filtered out.",
      "<strong>Meal Structure:</strong> Define your daily meal slots (e.g., Breakfast, Lunch, Mid-morning Snack, Dinner). This structure is used by the AI for planning."
    ]
  }
];

export default function GuidePage() {
  return (
    <PageWrapper title="Welcome to MealPlannerPro! Your App Guide">
      <p className="mb-6 text-lg text-muted-foreground">
        This guide will walk you through the main features of MealPlannerPro to help you get the most out of your meal planning experience.
      </p>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {sections.map((section, index) => (
          <Card key={index} className="shadow-md overflow-hidden">
            <AccordionItem value={`item-${index}`} className="border-none">
              <AccordionTrigger className="p-6 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center text-xl font-semibold text-primary">
                  <section.icon className="w-6 h-6 mr-3 text-accent" />
                  {section.title}
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0 text-base">
                <div className="space-y-3 text-foreground/90">
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} dangerouslySetInnerHTML={{ __html: paragraph.replace(/<Link href='([^']*)' class='([^']*)'>(.*?)<\/Link>/g, "<a href='$1' class='$2'>$3</a>").replace(/<Archive class='([^']*)' \/>/g, "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='$1'><rect width='20' height='14' x='2' y='7' rx='2' ry='2'/><path d='M16 3h-8C6.34 3 4.59 4.34 4 6h16c-.59-1.66-2.34-3-4-3Z'/><path d='M2 12h20'/></svg>") }} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>

      <Card className="mt-8 shadow-lg bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="font-headline text-primary flex items-center">
            <Settings className="w-6 h-6 mr-2 text-accent" />
            Pro Tip: Keep Your Profile Updated!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 text-base">
            The more accurately you set up your <a href="/profile/user-info" className="text-accent font-semibold underline hover:text-accent/80">User Info</a>, <a href="/profile/targets" className="text-accent font-semibold underline hover:text-accent/80">Targets</a>, <a href="/profile/diet-type" className="text-accent font-semibold underline hover:text-accent/80">Diet Type</a>, <a href="/profile/allergens" className="text-accent font-semibold underline hover:text-accent/80">Allergens</a>, and <a href="/profile/meal-structure" className="text-accent font-semibold underline hover:text-accent/80">Meal Structure</a>, the better MealPlannerPro can assist you, especially with AI-powered suggestions and recipe filtering. Also, keeping your <a href="/pantry" className="text-accent font-semibold underline hover:text-accent/80">Pantry</a> updated ensures your shopping lists are accurate!
          </p>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
