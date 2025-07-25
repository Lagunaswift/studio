"use client";
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggleButton() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, resolvedTheme } = useTheme();
    useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted) {
        // Return a placeholder or null to avoid hydration mismatch
        // and to prevent flash of incorrect icon. It's better to show something consistent.
        // This placeholder will show a Sun icon by default.
        return <Button variant="ghost" size="icon" className="w-9 h-9" disabled><Sun className="h-[1.2rem] w-[1.2rem]"/></Button>;
    }
    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };
    return (<Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {resolvedTheme === 'dark' ? (<Sun className="h-[1.2rem] w-[1.2rem]"/> // Display Sun icon when in dark mode (to switch to light)
        ) : (<Moon className="h-[1.2rem] w-[1.2rem]"/> // Display Moon icon when in light mode (to switch to dark)
        )}
       <span className="sr-only">Toggle theme</span>
    </Button>);
}
