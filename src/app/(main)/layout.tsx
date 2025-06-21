"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { SheetTitle } from '@/components/ui/sheet';
import { 
  UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, LayoutDashboard, 
  PanelLeft, Target, Leaf, Ban, ListChecks, UserCog, UserCircle2, 
  BookOpen, Archive, Bot, SlidersHorizontal 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const topLevelNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
];

const planningNavItems: NavItem[] = [
    { href: '/meal-plan', label: 'Daily Planner', icon: CalendarDays },
    { href: '/ai-suggestions', label: 'AI Meal Planner', icon: Sparkles },
    { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
    { href: '/pantry', label: 'Pantry', icon: Archive },
];

const recipesNavItems: NavItem[] = [
    { href: '/recipes', label: 'All Recipes', icon: UtensilsCrossed },
    { href: '/ai-recipe-finder', label: 'AI Recipe Finder', icon: Bot },
];

const profileNavItems: NavItem[] = [
  { href: '/profile/user-info', label: 'User Info', icon: UserCircle2 },
  { href: '/profile/targets', label: 'Targets', icon: Target },
  { href: '/profile/diet-type', label: 'Diet Type', icon: Leaf },
  { href: '/profile/allergens', label: 'Allergens', icon: Ban },
  { href: '/profile/meal-structure', label: 'Meal Structure', icon: ListChecks },
  { href: '/profile/dashboard-settings', label: 'Dashboard', icon: SlidersHorizontal },
];

const bottomLevelNavItems: NavItem[] = [
    { href: '/guide', label: 'App Guide', icon: BookOpen },
];


// Inner component to use hooks within SidebarProvider context
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobile, state: sidebarState } = useSidebar(); 

  const isPlanningSectionActive = planningNavItems.some(item => pathname.startsWith(item.href));
  const isRecipesSectionActive = recipesNavItems.some(item => pathname.startsWith(item.href));
  const isProfileSectionActive = profileNavItems.some(item => pathname.startsWith(item.href));

  const renderAccordion = (
    sectionId: string,
    title: string,
    Icon: LucideIcon,
    items: NavItem[],
    isActive: boolean
  ) => (
    <>
      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
        <Accordion type="single" collapsible className="w-full" defaultValue={isActive && sidebarState === 'expanded' ? sectionId : undefined}>
          <AccordionItem value={sectionId} className="border-none">
            <AccordionTrigger className={cn(
              "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:[&>span:last-child]:hidden [&>svg]:size-4 [&>svg]:shrink-0",
              "py-0 hover:no-underline",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            )}>
              <div className="flex items-center gap-2">
                <Icon />
                <span>{title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-0 pl-2 group-data-[collapsible=icon]:hidden">
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} size="sm" tooltip={{ children: item.label, side: 'right', align: 'center' }}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarMenuItem>
      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
        <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: title, side: 'right', align: 'center' }}>
          <Link href={items[0].href}>
            <Icon />
            <span className="sr-only">{title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  return (
    <div className="flex flex-1">
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-sidebar-primary" />
            <div className="group-data-[collapsible=icon]:hidden">
              {isMobile ? (
                 <SheetTitle className="text-xl font-bold font-headline text-sidebar-primary">
                   MealPlanner<span className="text-sidebar-accent">Pro</span>
                 </SheetTitle>
              ) : (
                <h1 id="sidebar-title" className="text-xl font-bold font-headline text-sidebar-primary">
                  MealPlanner<span className="text-sidebar-accent">Pro</span>
                </h1>
              )}
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex flex-col justify-between">
          <SidebarMenu>
            {topLevelNavItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: item.label, side: 'right', align: 'center' }}>
                    <Link href={item.href}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            
            {renderAccordion("planning-section", "Planning", CalendarDays, planningNavItems, isPlanningSectionActive)}
            {renderAccordion("recipes-section", "Recipes", UtensilsCrossed, recipesNavItems, isRecipesSectionActive)}
            {renderAccordion("profile-section", "Profile Settings", UserCog, profileNavItems, isProfileSectionActive)}
          </SidebarMenu>
          
          <SidebarMenu className="mt-auto">
            {bottomLevelNavItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: item.label, side: 'right', align: 'center' }}>
                      <Link href={item.href}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center border-b px-4 sticky top-0 bg-background z-40">
           <div className="w-10"> {/* Container for SidebarTrigger */}
            <SidebarTrigger className="text-primary hover:text-accent">
              <PanelLeft />
            </SidebarTrigger>
          </div>
          <h1 className="flex-grow text-center text-xl font-bold font-headline text-primary">
            MealPlanner<span className="text-accent">Pro</span>
          </h1>
          <div className="w-10"> {/* Container for ThemeToggleButton */}
            <ThemeToggleButton />
          </div>
        </header>
        <main className="flex-grow">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true} collapsible="icon">
      <div className="flex flex-col min-h-screen">
        <LayoutContent>{children}</LayoutContent>
        <Footer />
      </div>
    </SidebarProvider>
  );
}
