
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
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
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { SheetTitle } from '@/components/ui/sheet';
import { UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, LayoutDashboard, PanelLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { href: '/meal-plan', label: 'Meal Plan', icon: CalendarDays },
  { href: '/ai-suggestions', label: 'AI Suggestions', icon: Sparkles },
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
];

// New inner component to use hooks within SidebarProvider context
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobile } = useSidebar(); // Get isMobile state from context

  return (
    <div className="flex flex-1">
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-sidebar-primary" />
            <div className="group-data-[collapsible=icon]:hidden">
              {isMobile ? (
                <SheetTitle asChild>
                  <h1 id="sidebar-title" className="text-xl font-bold font-headline text-sidebar-primary">
                    MealPlanner<span className="text-sidebar-accent">Pro</span>
                  </h1>
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
            {navItems.map((item) => {
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
          </SidebarMenu>
        </SidebarContent>
        {/* SidebarFooter can be added here if needed */}
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center border-b px-4 justify-start sticky top-0 bg-background z-40">
          <SidebarTrigger className="text-primary hover:text-accent">
            <PanelLeft />
          </SidebarTrigger>
          {/* Other top bar items could go here, e.g., Page Title or User Profile */}
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
