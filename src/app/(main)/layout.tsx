
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
import { UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, LayoutDashboard, PanelLeft, Target, Leaf, Ban, Salad, ListChecks, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const mainNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { href: '/meal-plan', label: 'Meal Plan', icon: CalendarDays },
  { href: '/ai-suggestions', label: 'AI Suggestions', icon: Sparkles },
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
];

const profileNavItems: NavItem[] = [
  { href: '/profile/targets', label: 'Targets', icon: Target },
  { href: '/profile/diet-type', label: 'Diet Type', icon: Leaf },
  { href: '/profile/allergens', label: 'Allergens', icon: Ban },
  { href: '/profile/meal-structure', label: 'Meal Structure', icon: ListChecks },
];

// Inner component to use hooks within SidebarProvider context
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobile, state: sidebarState } = useSidebar(); 

  const isProfileSectionActive = profileNavItems.some(item => pathname.startsWith(item.href));

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
        <SidebarContent>
          <SidebarMenu>
            {mainNavItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <Accordion type="single" collapsible className="w-full" defaultValue={isProfileSectionActive && sidebarState === 'expanded' ? "dietary-prefs" : undefined}>
                <AccordionItem value="dietary-prefs" className="border-none">
                  <AccordionTrigger className={cn(
                    "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:[&>span:last-child]:hidden [&>svg]:size-4 [&>svg]:shrink-0",
                    "py-0 hover:no-underline", // Reset AccordionTrigger's default py and hover underline
                    isProfileSectionActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                  >
                     <div className="flex items-center gap-2">
                        <Salad />
                        <span>Dietary Preferences</span>
                      </div>
                      {/* AccordionTrigger adds its own ChevronDown */}
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-0 pl-2 group-data-[collapsible=icon]:hidden">
                    <SidebarMenu>
                      {profileNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              size="sm" // Make sub-items slightly smaller
                              tooltip={{ children: item.label, side: 'right', align: 'center' }}
                            >
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
              </Accordion>
            </SidebarMenuItem>

            {/* Tooltip for collapsed Dietary Preferences section */}
            <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
                 <SidebarMenuButton
                    asChild
                    isActive={isProfileSectionActive}
                    tooltip={{ children: "Dietary Preferences", side: 'right', align: 'center' }}
                  >
                    {/* This Link is a placeholder for tooltip appearance, actual navigation to a default profile page could be added */}
                    <Link href="/profile/targets"> 
                      <Salad />
                      <span className="sr-only">Dietary Preferences</span>
                    </Link>
                  </SidebarMenuButton>
            </SidebarMenuItem>


          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center border-b px-4 justify-between sticky top-0 bg-background z-40">
          <SidebarTrigger className="text-primary hover:text-accent">
            <PanelLeft />
          </SidebarTrigger>
          <ThemeToggleButton />
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
