"use client";

import Link from 'next/link';
import { UtensilsCrossed, Sparkles, ShoppingBag, CalendarDays, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recipes', label: 'Recipes', icon: UtensilsCrossed },
  { href: '/meal-plan', label: 'Meal Plan', icon: CalendarDays },
  { href: '/ai-suggestions', label: 'AI Suggestions', icon: Sparkles },
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingBag },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold font-headline text-primary">
            Macro<span className="text-accent">Teal</span> Planner
          </h1>
        </Link>
        <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href ? "text-primary font-semibold border-b-2 border-primary rounded-none" : "text-foreground/70"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        {/* Mobile Menu Trigger (optional, for future enhancement) */}
        {/* <div className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </div> */}
      </div>
    </header>
  );
}
