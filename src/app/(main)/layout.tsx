//src/app/(main)/layout.tsx - RESTRUCTURED SIDEBAR VERSION
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { TermsAcceptanceModal } from '@/components/legal/TermsAcceptanceModal';
import { PreppyHelp } from '@/components/shared/SimpleHelpWidget';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { SheetTitle } from '@/components/ui/sheet';
import { 
  UtensilsCrossed, 
  Wand2,
  ShoppingBag, 
  CalendarDays, 
  LayoutDashboard, 
  PanelLeft, 
  Target, 
  Leaf, 
  UserCog, 
  UserCircle2, 
  BookOpen, 
  Archive, 
  Bot, 
  SlidersHorizontal, 
  Search, 
  LogOut, 
  FileText, 
  Shield, 
  CheckSquare, 
  Settings, 
  TrendingUp, 
  ChefHat, 
  ClipboardList, 
  AlertTriangle, 
  Database, 
  WifiOff, 
  MessageSquareWarning, 
  Megaphone,
  Brain,
  Plus
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, type FormEvent, useEffect, useTransition } from 'react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const dashboardNavItem: NavItem = { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true };

// RESTRUCTURED NAVIGATION GROUPS
const mealPlanningNavItems: NavItem[] = [
  { href: '/meal-plan', label: 'Meal Planner', icon: CalendarDays },
  { href: '/meal-plan/weekly', label: 'Weekly View', icon: CalendarDays },
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
  { href: '/pantry', label: 'Pantry', icon: Archive },
];

// Meal Plan Generator sub-item for accordion
const mealPlanGeneratorNavItem: NavItem = { href: '/ai-suggestions', label: 'AI Plan Generator', icon: Wand2 };

// Pantry Chef sub-item for accordion  
const pantryChefNavItem: NavItem = { href: '/ai-recipe-finder', label: 'AI Pantry Chef', icon: ChefHat };

const cookbookNavItems: NavItem[] = [
  { href: '/recipes', label: 'My Recipes', icon: UtensilsCrossed },
  { href: '/recipes/add', label: 'Add Recipe', icon: Plus },
];

const preppyCoachNavItems: NavItem[] = [
  { href: '/daily-check-in', label: 'Daily Check-In', icon: ClipboardList },
  { href: '/weekly-check-in', label: 'Weekly Check-in', icon: CheckSquare },
];

const setupNavItems: NavItem[] = [
  { href: '/profile/user-info', label: 'My Profile', icon: UserCircle2 },
  { href: '/profile/targets', label: 'Goals & Targets', icon: Target },
  { href: '/profile/diet-type', label: 'Diet & Allergens', icon: Leaf },
  { href: '/profile/meal-structure', label: 'Meal Structure', icon: SlidersHorizontal },
  { href: '/profile/dashboard-settings', label: 'Dashboard Settings', icon: Settings },
];

const helpNavItems: NavItem[] = [
  { href: '/guide', label: 'User Guide', icon: BookOpen },
  { href: '/updates', label: 'Updates & Feedback', icon: Megaphone },
  { href: '/privacy', label: 'Privacy Policy', icon: Shield },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
];

const allNavItems: NavItem[] = [
  dashboardNavItem,
  ...mealPlanningNavItems,
  mealPlanGeneratorNavItem,
  ...cookbookNavItems,
  pantryChefNavItem,
  ...preppyCoachNavItems,
  ...setupNavItems,
  ...helpNavItems,
];

function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-left font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      onClick={handleLogout}
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
    </Button>
  );
}

function ServiceStatusBanner() {
  const { isOnline } = useAppContext();

  if (isOnline) return null;

  return (
    <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
      <WifiOff className="inline w-4 h-4 mr-2" />
      You are currently offline. Some features may not work properly.
    </div>
  );
}

function DevStatusIndicator() {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-mono z-50">
      DEV
    </div>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    userProfile, 
    acceptTerms: acceptTermsContext, 
    isDataLoading: isAppDataLoading 
  } = useAppContext();
  
  const [showTerms, setShowTerms] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);

  // Fix hydration mismatch by ensuring client-side only rendering for certain elements
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check terms acceptance
  useEffect(() => {
    if (!isAppDataLoading && userProfile && !userProfile.has_accepted_terms) {
      setShowTerms(true);
    } else {
      setShowTerms(false);
    }
  }, [userProfile, isAppDataLoading]);

  const handleAcceptTerms = () => {
      startTransition(async () => {
          await acceptTermsContext();
          setShowTerms(false);
      });
  };

  const getCurrentPageTitle = () => {
    // Specific titles for AI pages
    if (pathname === '/ai-suggestions') return 'Preppy: Meal Plan Generator';
    if (pathname === '/ai-recipe-finder') return 'Preppy: Pantry Chef';
    if (pathname === '/weekly-check-in') return 'Preppy: Weekly Check-in';
    
    // General titles
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/recipes/add')) return 'Add New Recipe';
    if (pathname.match(/^\/recipes\/\d+$/)) return 'Recipe Details';
    
    let bestMatch: { href: string; label: string; } | undefined;
    for (const item of allNavItems) {
      if (item.href === '/') continue; 
      if (pathname.startsWith(item.href)) {
        if (!bestMatch || item.href.length > bestMatch.href.length) {
          bestMatch = item;
        }
      }
    }
    return bestMatch ? bestMatch.label : "MealPlannerPro";
  };
  
  const currentPageTitle = getCurrentPageTitle();

  // Prevent hydration mismatch by not rendering sidebar-dependent content until client-side
  if (!isClient) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 min-h-screen">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 bg-background border-b">
            <div className="flex items-center gap-2 px-4">
              <h1 className="font-semibold">{currentPageTitle}</h1>
            </div>
            <div className="ml-auto px-4 flex items-center gap-2">
              <ThemeToggleButton />
            </div>
          </header>
          <main className="flex-1 flex flex-col p-4 pt-0">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // Client-side rendering with sidebar
  const { isMobile, isCollapsed } = useSidebar();

  return (
    <div className="flex flex-1">
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-sidebar-primary" />
            <div className="group-data-[collapsible=icon]:hidden">
              {isMobile ? (
                <span className="font-bold text-sidebar-primary">MealPlannerPro</span>
              ) : (
                <div>
                  <div className="font-bold text-sidebar-primary">MealPlannerPro</div>
                  <div className="text-xs text-sidebar-muted">Smart Nutrition</div>
                </div>
              )}
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex flex-col h-full">
          <div className="flex-1 py-2">
            {/* Dashboard */}
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === dashboardNavItem.href}>
                    <Link href={dashboardNavItem.href}>
                      <dashboardNavItem.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{dashboardNavItem.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            {/* Meal Planning Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Meal Planning</SidebarGroupLabel>
              <SidebarMenu>
                {mealPlanningNavItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  
                  // Special handling for Meal Planner with accordion
                  if (item.href === '/meal-plan') {
                    return (
                      <div key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive}>
                                <Link href={item.href}>
                                  <item.icon />
                                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* AI Plan Generator as sub-item */}
                        <div className="ml-4 group-data-[collapsible=icon]:hidden">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === mealPlanGeneratorNavItem.href} size="sm">
                                  <Link href={mealPlanGeneratorNavItem.href}>
                                    <mealPlanGeneratorNavItem.icon />
                                    <span className="text-sm">{mealPlanGeneratorNavItem.label}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                              {mealPlanGeneratorNavItem.label}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  }
                  
                  // Special handling for Pantry with accordion
                  if (item.href === '/pantry') {
                    return (
                      <div key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild isActive={isActive}>
                                <Link href={item.href}>
                                  <item.icon />
                                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* AI Pantry Chef as sub-item */}
                        <div className="ml-4 group-data-[collapsible=icon]:hidden">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === pantryChefNavItem.href} size="sm">
                                  <Link href={pantryChefNavItem.href}>
                                    <pantryChefNavItem.icon />
                                    <span className="text-sm">{pantryChefNavItem.label}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                              {pantryChefNavItem.label}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  }
                  
                  // Regular items
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.href}>
                              <item.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            {/* My Cookbook Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">My Cookbook</SidebarGroupLabel>
              <SidebarMenu>
                {cookbookNavItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.href}>
                              <item.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            {/* Preppy Coach Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden flex items-center">
                <Brain className="h-4 w-4 mr-1" />
                Preppy Coach
              </SidebarGroupLabel>
              <SidebarMenu>
                {preppyCoachNavItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.href}>
                              <item.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            {/* Setup Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Setup</SidebarGroupLabel>
              <SidebarMenu>
                {setupNavItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.href}>
                              <item.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </div>

          {/* Footer Section */}
          <div className="mt-auto py-2">
            <SidebarSeparator className="my-2" />
            
            {/* Help Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Help & Legal</SidebarGroupLabel>
              <SidebarMenu>
                {helpNavItems.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.href}>
                              <item.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />
            
            {/* Logout */}
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <LogoutButton />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex flex-col flex-1">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" />
            <h1 className="font-semibold">{currentPageTitle}</h1>
          </div>
          <div className="ml-auto px-4 flex items-center gap-2">
            <ThemeToggleButton />
            <PreppyHelp />
          </div>
        </header>
        
        <ServiceStatusBanner />
        
        <main className="flex-1 flex flex-col p-4 pt-0">
          {children}
        </main>
        
        <Footer />
      </SidebarInset>

      <TermsAcceptanceModal 
        isOpen={showTerms} 
        onAccept={handleAcceptTerms} 
        isLoading={isPending}
      />
      
      <DevStatusIndicator />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <LayoutContent>{children}</LayoutContent>
      </SidebarProvider>
    </TooltipProvider>
  );
}