'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HelpCircle, Search, Book, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Simple FAQ data - no AI needed
const FAQ_DATA = [
  {
    id: 1,
    question: "How do I add a recipe to my meal plan?",
    answer: "Go to Plan → Daily/Weekly View, click on a meal slot, then browse and select recipes to add.",
    keywords: ["recipe", "meal plan", "add", "planning"],
    category: "Meal Planning"
  },
  {
    id: 2,
    question: "How do I set my macro targets?",
    answer: "Go to Profile → Dietary Targets. Use the Goal Calculator for automatic suggestions or set them manually.",
    keywords: ["macro", "targets", "calories", "protein", "goals"],
    category: "Goals & Targets"
  },
  {
    id: 3,
    question: "How do I track my daily weight?",
    answer: "On the Dashboard, use the Daily Weight Log widget to quickly record your weight each day.",
    keywords: ["weight", "tracking", "log", "dashboard"],
    category: "Tracking"
  },
  {
    id: 4,
    question: "How do I use the pantry feature?",
    answer: "Go to Pantry & Shopping → My Pantry. Add ingredients you have at home, and the app will generate shopping lists based on what you need.",
    keywords: ["pantry", "ingredients", "shopping", "inventory"],
    category: "Pantry & Shopping"
  },
  {
    id: 5,
    question: "How do I mark meals as eaten?",
    answer: "In your meal plan, click the checkbox next to each meal to mark it as consumed. This is important for accurate macro tracking.",
    keywords: ["eaten", "consumed", "tracking", "checkbox", "meals"],
    category: "Meal Planning"
  },
  {
    id: 6,
    question: "How do I calculate my TDEE?",
    answer: "Go to Profile → User Information and fill out your height, weight, age, sex, and activity level. Your TDEE will be calculated automatically.",
    keywords: ["tdee", "energy", "expenditure", "calculate", "profile"],
    category: "Profile Setup"
  },
  {
    id: 7,
    question: "How do I filter recipes by dietary preferences?",
    answer: "Go to Profile → Diet & Allergens to set your preferences. Recipes will be automatically filtered throughout the app.",
    keywords: ["filter", "dietary", "preferences", "vegetarian", "allergens"],
    category: "Recipes"
  },
  {
    id: 8,
    question: "How do I create custom meal slots?",
    answer: "Go to Profile → Meal Structure to define your daily meals (e.g., 'Post-Workout', 'Evening Snack').",
    keywords: ["meal structure", "custom", "slots", "breakfast", "dinner"],
    category: "Profile Setup"
  }
];

export function SimpleHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simple search function - no AI needed
  const searchResults = FAQ_DATA.filter(faq => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
      faq.category.toLowerCase().includes(query)
    );
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
          aria-label="Get help"
        >
          <HelpCircle className="h-7 w-7" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-headline text-primary">
            <Book className="w-6 h-6 mr-2 text-accent" />
            Help & FAQ
          </DialogTitle>
          <DialogDescription>
            Search our frequently asked questions or browse by category
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help... (e.g., 'add recipe', 'macro targets')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[400px] space-y-3">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No help articles found for "{searchQuery}"</p>
                <p className="text-sm mt-2">Try searching for: "recipe", "macro", "weight", or "pantry"</p>
              </div>
            ) : (
              searchResults.map((faq) => (
                <Card key={faq.id} className="border-l-4 border-l-accent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{faq.question}</CardTitle>
                    <CardDescription className="text-xs text-accent">{faq.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/80">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Additional Help */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground text-center">
              Still need help? 
              <Button variant="link" className="p-0 ml-1 h-auto text-sm" asChild>
                <a href="/feedback" className="flex items-center">
                  Contact Support <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}