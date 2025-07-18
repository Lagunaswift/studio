
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { TermsAcceptanceModal } from '@/components/legal/TermsAcceptanceModal';
import { PreppyHelp } from '@/components/shared/PreppyHelp'; // Import the new component
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
} from '@/components/ui/sidebar';
import { SheetTitle } from '@/components/ui/sheet';
import { 
  UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, LayoutDashboard, 
  PanelLeft, Target, Leaf, ListChecks, UserCog, UserCircle2, 
  BookOpen, Archive, Bot, SlidersHorizontal, Search, LogOut, FileText, Shield, CheckSquare, Settings, TrendingUp, ChefHat, ClipboardList, AlertTriangle, Database, WifiOff
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, type FormEvent } from 'react';
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
  { href: '/recipes', label: 'My Saved Recipes', icon: UtensilsCrossed },
];

const progressNavItems: NavItem[] = [
    { href: '/daily-log', label: 'Daily Log', icon: ClipboardList },
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
    { href: '/terms', label: 'Terms of Service', icon: FileText },
    { href: '/privacy', label: 'Privacy Policy', icon: Shield },
];

const mainSections = [
  { label: 'Plan', icon: CalendarDays, items: planNavItems },
  { label: 'Recipes', icon: UtensilsCrossed, items: recipesNavItems },
  { label: 'Progress', icon: TrendingUp, items: progressNavItems },
  { label: 'Settings', icon: Settings, items: settingsNavItems },
];

const allNavItems = [
    dashboardNavItem,
    ...planNavItems,
    ...recipesNavItems,
    ...progressNavItems,
    ...settingsNavItems,
    ...helpNavItems,
];

// Search Component for the Sidebar
function SidebarSearch() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/recipes?q=${encodeURIComponent(search.trim())}`);
    if (isMobile) {
      setOpenMobile(false);
    }
    setSearch('');
  };

  return (
    <div className="px-3 py-2 group-data-[collapsible=icon]:px-2">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 h-9 bg-sidebar-accent/50 border-sidebar-border group-data-[collapsible=icon]:pl-2 group-data-[collapsible=icon]:text-center"
              />
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="group-data-[state=expanded]:hidden">
              Search recipes
            </TooltipContent>
          </Tooltip>
      </form>
    </div>
  );
}

function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={handleLogout} tooltip={{ children: "Log Out", side: 'right', align: 'center' }}>
        <LogOut />
        <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
      We are performing system maintenance. The app is in offline mode; your data is saved locally and will not sync across devices for now.
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg",
              isOnline ? "bg-green-600" : "bg-orange-500"
            )}>
              {isOnline ? <Database className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{isOnline ? "Supabase Mode" : "Local Mode"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{isOnline ? "Data is being sent to Supabase." : "Data is being saved to local browser storage."}</p>
            <p className="text-muted-foreground">This indicator is only visible in development.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}


// Inner component to use hooks within SidebarProvider context
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, acceptTerms, isAppDataLoading } = useAppContext();
  const { user, isLoading: isAuthLoading } = useAuth();

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
  const { isMobile } = useSidebar();


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
        <SidebarSearch />
        <SidebarContent className="flex flex-col justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === dashboardNavItem.href} tooltip={{ children: dashboardNavItem.label, side: 'right', align: 'center' }}>
                <Link href={dashboardNavItem.href}>
                  <dashboardNavItem.icon />
                  <span className="group-data-[collapsible=icon]:hidden">{dashboardNavItem.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
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
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton asChild isActive={isActive} size="sm" className="h-8 font-normal">
                              <Link href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="hidden flex-col gap-1 group-data-[collapsible=icon]:flex">
              {mainSections.map(section => (
                <SidebarMenuItem key={`collapsed-${section.label}`}>
                    <SidebarMenuButton asChild isActive={section.items.some(item => pathname.startsWith(item.href))} tooltip={{ children: section.label, side: 'right', align: 'center' }}>
                      <Link href={section.items[0].href}>
                        <section.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{section.label}</span>
                      </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>

          </SidebarMenu>
          
          <SidebarMenu className="mt-auto">
             {helpNavItems.map((item) => {
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
            {user && <LogoutButton />}
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
            {currentPageTitle}
          </h1>
          <div className="w-10 flex justify-end"> {/* Container for ThemeToggleButton */}
            <ThemeToggleButton />
          </div>
        </header>
        <main className="flex-grow">
          {children}
        </main>
      </SidebarInset>
      <DevStatusIndicator />
      <PreppyHelp /> {/* Add the help component */}
      <TermsAcceptanceModal
        isOpen={!isAppDataLoading && !!userProfile && !userProfile.hasAcceptedTerms}
        onAccept={acceptTerms}
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
