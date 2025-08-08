//src/app/(main)/layout.tsx - COMPLETE WORKING VERSION
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
  Wand2, // CHANGED FROM Wand2 TO Wand2
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
  Megaphone
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

const planNavItems: NavItem[] = [
    { href: '/ai-suggestions', label: 'Preppy: Plan Generator', icon: Wand2 }, // CHANGED FROM Wand2
    { href: '/meal-plan', label: 'Daily/Weekly View', icon: CalendarDays },
    { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
    { href: '/pantry', label: 'Pantry', icon: Archive },
];

const recipesNavItems: NavItem[] = [
  { href: '/ai-recipe-finder', label: 'Preppy: Pantry Chef', icon: ChefHat },
  { href: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
];

const progressNavItems: NavItem[] = [
    { href: '/daily-check-in', label: 'Daily Check-In', icon: ClipboardList },
    { href: '/weekly-check-in', label: 'Preppy: Weekly Check-in', icon: CheckSquare },
];

const settingsNavItems: NavItem[] = [
  { href: '/profile/user-info', label: 'My Profile', icon: UserCircle2 },
  { href: '/profile/targets', label: 'My Goals & Targets', icon: Target },
  { href: '/profile/diet-type', label: 'Diet Type', icon: Leaf },
  { href: '/profile/meal-structure', label: 'Meal Structure', icon: SlidersHorizontal },
  { href: '/profile/dashboard-settings', label: 'Dashboard Settings', icon: Settings },
];

// ADDED MISSING helpNavItems
const helpNavItems: NavItem[] = [
  { href: '/guide', label: 'User Guide', icon: BookOpen },
  { href: '/updates', label: 'Updates & Feedback', icon: Megaphone },
  { href: '/privacy', label: 'Privacy Policy', icon: Shield },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
];

const allNavItems: NavItem[] = [
    dashboardNavItem,
    ...planNavItems,
    ...recipesNavItems,
    ...progressNavItems,
    ...settingsNavItems,
    ...helpNavItems, // NOW PROPERLY DEFINED
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
    if (pathname === '/ai-suggestions') return 'Preppy: Plan Generator';
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
            
            {/* Plan Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Plan</SidebarGroupLabel>
              <SidebarMenu>
                {planNavItems.map((item) => {
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
            
            {/* Recipes Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Recipes</SidebarGroupLabel>
              <SidebarMenu>
                {recipesNavItems.map((item) => {
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
            
            {/* Progress Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Progress</SidebarGroupLabel>
              <SidebarMenu>
                {progressNavItems.map((item) => {
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
            
            {/* Settings Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Settings</SidebarGroupLabel>
              <SidebarMenu>
                {settingsNavItems.map((item) => {
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
            
            {/* Help Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Help</SidebarGroupLabel>
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
            
            {!isAuthLoading && user && <LogoutButton />}
          </div>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center border-b px-4 sticky top-0 bg-background z-40">
           <div className="w-10">
            <SidebarTrigger className="text-primary hover:text-accent">
              <PanelLeft />
            </SidebarTrigger>
          </div>
          <h1 className="flex-grow text-center text-xl font-bold font-headline text-primary">
            {currentPageTitle}
          </h1>
          <div className="w-10 flex justify-end">
            <ThemeToggleButton />
          </div>
        </header>
        <main className="flex-grow">
          {children}
        </main>
      </SidebarInset>
      <DevStatusIndicator />
      <PreppyHelp />
      <TermsAcceptanceModal
        isOpen={showTerms}
        onAccept={handleAcceptTerms}
        isPending={isPending}
      />
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
       <TooltipProvider>
          <div className="flex flex-col min-h-screen">
            <ServiceStatusBanner />
            <LayoutContent>{children}</LayoutContent>
            <Footer />
          </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}