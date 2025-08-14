//src/app/(main)/layout.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { TermsAcceptanceModal } from '@/components/legal/TermsAcceptanceModal';
import { PreppyHelp } from '@/components/ai-coach/ProgressiveAIWidget';
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
  UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, LayoutDashboard, 
  PanelLeft, Target, Leaf, ListChecks, UserCog, UserCircle2, 
  BookOpen, Archive, Bot, SlidersHorizontal, Search, LogOut, FileText, Shield, CheckSquare, Settings, TrendingUp, ChefHat, ClipboardList, AlertTriangle, Database, WifiOff, MessageSquareWarning, Megaphone, HelpCircle
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
    { href: '/ai-suggestions', label: 'Preppy: Plan Generator', icon: Sparkles },
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
  { href: '/profile/diet-type', label: 'Diet & Allergens', icon: Leaf },
  { href: '/profile/meal-structure', label: 'Meal Structure', icon: ListChecks },
  { href: '/profile/dashboard-settings', label: 'Customize Dashboard', icon: SlidersHorizontal },
];

const helpNavItems: NavItem[] = [
    { href: '/guide', label: 'App Guide', icon: BookOpen },
    { href: '/updates', label: 'Updates & Feedback', icon: Megaphone },
    { href: '/terms', label: 'Terms of Service', icon: FileText },
    { href: '/privacy', label: 'Privacy Policy', icon: Shield },
];

const mainSections = [
  { label: 'Planner', icon: CalendarDays, items: planNavItems },
  { label: 'Recipe Book', icon: UtensilsCrossed, items: recipesNavItems },
  { label: 'Progress', icon: TrendingUp, items: progressNavItems },
  { label: 'Settings', icon: Settings, items: settingsNavItems },
  { label: 'Help', icon: HelpCircle, items: helpNavItems },
];

const allNavItems = [
    dashboardNavItem,
    ...planNavItems,
    ...recipesNavItems,
    ...progressNavItems,
    ...settingsNavItems,
    ...helpNavItems,
];

function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { isCollapsed } = useSidebar();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Tooltip>
        <TooltipTrigger asChild>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="mt-2">
                <LogOut />
                <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" hidden={!isCollapsed}>Log Out</TooltipContent>
    </Tooltip>
  );
}

function ServiceStatusBanner() {
  const { isOnline } = useAppContext();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-center p-2 text-black text-sm font-semibold flex items-center justify-center">
      <AlertTriangle className="h-4 w-4 mr-2" />
      You are currently offline. Changes are being saved locally and will sync when you reconnect.
    </div>
  );
}

function DevStatusIndicator() {
  const { isOnline } = useAppContext();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
     <div className="fixed bottom-2 left-2 z-50">
        <div title={isOnline ? "Data is being sent to Firebase." : "Data is being saved to local browser storage."} className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg",
          isOnline ? "bg-green-600" : "bg-orange-500"
        )}>
          {isOnline ? <Database className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
    </div>
  );
}

function SidebarSearch() {
  const [search, setSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { isCollapsed } = useSidebar();

  // Fix hydration by ensuring consistent server/client rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/recipes?q=${encodeURIComponent(search.trim())}`);
    }
  };

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!isMounted) {
    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            className="pl-8"
            disabled
          />
        </div>
      </div>
    );
  }

  return (
     <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:-translate-x-1/2" />
              <form onSubmit={handleSearch}>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search recipes..."
                  className={cn("pl-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:focus-visible:ring-0 group-data-[collapsible=icon]:focus-visible:ring-offset-0 group-data-[collapsible=icon]:cursor-pointer",
                  "transition-all duration-300 ease-in-out"
                  )}
                  onClick={(e) => {
                      if (isCollapsed) {
                          e.preventDefault();
                      }
                  }}
                />
              </form>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" hidden={!isCollapsed}>
          Search recipes
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// 🔧 FIX: Split the component to ensure hooks are always called in the same order
function LayoutContent({ children }: { children: React.ReactNode }) {
  // ✅ ALWAYS call all hooks in the same order, regardless of conditions
  const pathname = usePathname();
  const { userProfile, acceptTerms: acceptTermsContext, isAppDataLoading } = useAppContext();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [showTerms, setShowTerms] = useState(false);
  
  // ✅ FIX: Always call useSidebar - move the conditional logic AFTER the hook call
  const sidebarContext = useSidebar();
  const { isMobile, isCollapsed } = sidebarContext;

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
    if (pathname === '/ai-suggestions') return 'Preppy: Plan Generator';
    if (pathname === '/ai-recipe-finder') return 'Preppy: Pantry Chef';
    if (pathname === '/weekly-check-in') return 'Preppy: Weekly Check-in';
    
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
    return bestMatch ? bestMatch.label : "MealPreppy";
  };
  
  const currentPageTitle = getCurrentPageTitle();

  return (
    <div className="flex flex-1 w-full min-w-0">
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-sidebar-primary" />
            <div className="group-data-[collapsible=icon]:hidden">
              {isMobile ? (
                 <SheetTitle className="text-xl font-bold font-headline text-sidebar-primary">
                   MealPreppy<span className="text-sidebar-accent">Pro</span>
                 </SheetTitle>
              ) : (
                <h1 id="sidebar-title" className="text-xl font-bold font-headline text-sidebar-primary">
                  MealPreppy<span className="text-sidebar-accent">Pro</span>
                </h1>
              )}
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex flex-col justify-between">
          <SidebarMenu>
            <SidebarMenuItem className="px-2">
               <SidebarSearch/>
            </SidebarMenuItem>
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === dashboardNavItem.href}>
                        <Link href={dashboardNavItem.href}>
                          <dashboardNavItem.icon />
                          <span className="group-data-[collapsible=icon]:hidden">{dashboardNavItem.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                  {dashboardNavItem.label}
                </TooltipContent>
            </Tooltip>
            
            <Accordion type="multiple" className="w-full space-y-0 px-2 group-data-[collapsible=icon]:hidden">
              {mainSections.map(section => (
                 <AccordionItem key={section.label} value={section.label.toLowerCase()} className="border-none">
                  <AccordionTrigger className="p-2 text-sm font-medium hover:no-underline hover:bg-sidebar-accent rounded-md [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-2">
                       <section.icon />
                       <span>{section.label}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-4">
                     <SidebarMenu className="py-1 space-y-1">
                      {section.items.map((item) => {
                        const isActive = item.exact ? 
                          pathname === item.href : pathname.startsWith(item.href);
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
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <SidebarSeparator className="my-2" />
            
            {!isAuthLoading && user && <LogoutButton />}
          </SidebarMenu>
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
        <main className="flex-1 overflow-hidden">
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