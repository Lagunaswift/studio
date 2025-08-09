//src/app/(main)/layout.tsx - RESTRUCTURED SIDEBAR VERSION WITH ACCORDION NAVIGATION
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { TermsAcceptanceModal } from '@/components/legal/TermsAcceptanceModal';
import { PreppyHelp } from '@/components/shared/SimpleHelpWidget';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { SheetTitle } from '@/components/ui/sheet';
import { 
  UtensilsCrossed, 
  Wand2,
  ShoppingBag, 
  CalendarDays, 
  LayoutDashboard, 
  Target, 
  Leaf, 
  UserCircle2, 
  BookOpen, 
  Archive, 
  SlidersHorizontal, 
  LogOut, 
  FileText, 
  Shield, 
  CheckSquare, 
  Settings, 
  ChefHat, 
  ClipboardList, 
  WifiOff, 
  Megaphone,
  Plus,
  ChevronRight
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

interface NavGroup {
  label: string;
  items: NavItem[];
  subItems?: Record<string, NavItem[]>;
}

const dashboardNavItem: NavItem = { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true };

// RESTRUCTURED NAVIGATION WITH ACCORDION GROUPS
const navigationGroups: NavGroup[] = [
  // Meal Planning Group
  {
    label: 'Meal Planning',
    items: [
      { href: '/meal-plan', label: 'Meal Planner', icon: CalendarDays },
      { href: '/meal-plan/weekly', label: 'Weekly View', icon: CalendarDays },
      { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
      { href: '/pantry', label: 'Pantry', icon: Archive },
    ],
    subItems: {
      '/meal-plan': [
        { href: '/ai-suggestions', label: 'AI Plan Generator', icon: Wand2 }
      ],
      '/pantry': [
        { href: '/ai-recipe-finder', label: 'AI Pantry Chef', icon: ChefHat }
      ]
    }
  },
  // My Cookbook Group
  {
    label: 'My Cookbook',
    items: [
      { href: '/recipes', label: 'My Recipes', icon: UtensilsCrossed },
      { href: '/recipes/add', label: 'Add Recipe', icon: Plus },
    ]
  },
  // Preppy Coach Group
  {
    label: '🧠 Preppy Coach',
    items: [
      { href: '/daily-check-in', label: 'Daily Check-In', icon: ClipboardList },
      { href: '/weekly-check-in', label: 'Weekly Check-in', icon: CheckSquare },
    ]
  },
  // Setup Group (formerly Settings)
  {
    label: 'Setup',
    items: [
      { href: '/profile/user-info', label: 'My Profile', icon: UserCircle2 },
      { href: '/profile/targets', label: 'Goals & Targets', icon: Target },
      { href: '/profile/diet-type', label: 'Diet & Allergens', icon: Leaf },
      { href: '/profile/meal-structure', label: 'Meal Structure', icon: SlidersHorizontal },
      { href: '/profile/dashboard-settings', label: 'Dashboard Settings', icon: Settings },
    ]
  },
  // Help & Legal Group
  {
    label: 'Help & Legal',
    items: [
      { href: '/guide', label: 'User Guide', icon: BookOpen },
      { href: '/updates', label: 'Updates & Feedback', icon: Megaphone },
      { href: '/privacy', label: 'Privacy Policy', icon: Shield },
      { href: '/terms', label: 'Terms of Service', icon: FileText },
    ]
  }
];

// Collect all navigation items for page title matching
const allNavItems: NavItem[] = [
  dashboardNavItem,
  ...navigationGroups.flatMap(group => [
    ...group.items,
    ...(group.subItems ? Object.values(group.subItems).flat() : [])
  ])
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
      You are currently offline.
    </div>
  );
}

function DevStatusIndicator() {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-2 py-1 rounded text-xs">
      DEV
    </div>
  );
}

function NavigationGroup({ group, pathname, isCollapsed }: { 
  group: NavGroup; 
  pathname: string; 
  isCollapsed: boolean; 
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Auto-expand sections if they contain the current page
  useEffect(() => {
    if (group.subItems) {
      const shouldExpand: Record<string, boolean> = {};
      Object.entries(group.subItems).forEach(([parentHref, subItems]) => {
        const hasActiveSubItem = subItems.some(subItem => pathname === subItem.href);
        if (hasActiveSubItem) {
          shouldExpand[parentHref] = true;
        }
      });
      setExpandedSections(prev => ({ ...prev, ...shouldExpand }));
    }
  }, [pathname, group.subItems]);

  const toggleSection = (href: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
        {group.label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const hasSubItems = group.subItems?.[item.href];
          const isExpanded = expandedSections[item.href];

          return (
            <div key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuItem>
                    <div className="flex items-center w-full">
                      <SidebarMenuButton asChild isActive={isActive} className="flex-1">
                        <Link href={item.href}>
                          <item.icon />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {hasSubItems && !isCollapsed && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 h-auto w-auto mr-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
                          onClick={() => toggleSection(item.href)}
                        >
                          <ChevronRight 
                            className={cn(
                              "h-3 w-3 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </Button>
                      )}
                    </div>
                  </SidebarMenuItem>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                  {item.label}
                </TooltipContent>
              </Tooltip>

              {/* Sub-items for expanded sections */}
              {hasSubItems && !isCollapsed && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {hasSubItems.map((subItem) => (
                    <Tooltip key={subItem.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                            <Link href={subItem.href}>
                              <subItem.icon />
                              <span>{subItem.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center">
                        {subItem.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Show sub-items when collapsed and parent is active */}
              {hasSubItems && isCollapsed && isActive && (
                <div className="ml-4">
                  {hasSubItems.map((subItem) => (
                    <Tooltip key={subItem.href}>
                      <TooltipTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={pathname === subItem.href} size="sm">
                            <Link href={subItem.href}>
                              <subItem.icon />
                              <span className="group-data-[collapsible=icon]:hidden">{subItem.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center">
                        {subItem.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showTerms, handleAcceptTerms } = useAppContext();
  const [isPending, startTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getCurrentPageTitle = () => {
    const bestMatch = allNavItems.find(item => 
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );
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
            {/* Dashboard - Always at top */}
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={pathname === dashboardNavItem.href}>
                        <Link href={dashboardNavItem.href}>
                          <dashboardNavItem.icon />
                          <span className="group-data-[collapsible=icon]:hidden">{dashboardNavItem.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" hidden={!isCollapsed}>
                      {dashboardNavItem.label}
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            {/* Navigation Groups with Accordion Structure */}
            {navigationGroups.map((group, index) => (
              <div key={group.label}>
                <NavigationGroup 
                  group={group} 
                  pathname={pathname} 
                  isCollapsed={isCollapsed} 
                />
                {index < navigationGroups.length - 1 && <SidebarSeparator className="my-2" />}
              </div>
            ))}
          </div>

          {/* Footer Section - Logout */}
          <div className="mt-auto py-2">
            <SidebarSeparator className="my-2" />
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