"use client";

import { useState, useEffect } from 'react';
import { Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading text collections for different contexts
const LOADING_TEXTS = {
  'meal-plan': [
    "Preppy is rifling through recipe books...",
    "Preppy is checking your pantry inventory...",
    "Preppy is calculating perfect macro ratios...",
    "Preppy is considering your taste preferences...",
    "Preppy is avoiding your allergens like a pro...",
    "Preppy is balancing flavors and nutrients...",
    "Preppy is making sure you'll actually enjoy this...",
    "Preppy is cross-referencing cooking times...",
    "Preppy is optimizing for your schedule...",
    "Preppy is adding some culinary magic...",
    "Preppy is double-checking portion sizes...",
    "Preppy is ensuring variety in your week..."
  ],
  'weekly-analysis': [
    "Preppy is analyzing your weight trends...",
    "Preppy is crunching your TDEE numbers...",
    "Preppy is spotting patterns you might have missed...",
    "Preppy is reviewing your energy levels...",
    "Preppy is calculating metabolic adaptations...",
    "Preppy is cross-referencing sleep and progress...",
    "Preppy is preparing your coaching summary...",
    "Preppy is fine-tuning your targets...",
    "Preppy is connecting the dots in your data...",
    "Preppy is crafting personalized recommendations...",
    "Preppy is making sure the math adds up...",
    "Preppy is getting excited about your progress..."
  ],
  'recipe': [
    "Preppy is scanning your pantry...",
    "Preppy is matching ingredients to recipes...",
    "Preppy is checking expiration dates...",
    "Preppy is considering your energy levels today...",
    "Preppy is thinking about prep time...",
    "Preppy is avoiding ingredients you dislike...",
    "Preppy is prioritizing your favorite flavors...",
    "Preppy is balancing ease and nutrition...",
    "Preppy is making sure you have everything...",
    "Preppy is picking recipes you'll love...",
    "Preppy is considering your cooking mood...",
    "Preppy is factoring in your schedule..."
  ],
  'chat': [
    "Preppy is thinking deeply...",
    "Preppy is consulting nutrition guidelines...",
    "Preppy is reviewing your progress data...",
    "Preppy is crafting the perfect response...",
    "Preppy is checking the latest research...",
    "Preppy is personalizing advice for you...",
    "Preppy is making sure this is accurate...",
    "Preppy is channeling inner nutrition wisdom...",
    "Preppy is connecting theory to your reality...",
    "Preppy is preparing evidence-based advice...",
    "Preppy is tailoring this to your goals...",
    "Preppy is making complex things simple..."
  ],
  'data-analysis': [
    "Preppy is diving into your data...",
    "Preppy is spotting interesting patterns...",
    "Preppy is correlating sleep with performance...",
    "Preppy is analyzing your best days...",
    "Preppy is identifying optimization opportunities...",
    "Preppy is comparing weeks and months...",
    "Preppy is calculating trend confidence...",
    "Preppy is preparing insights...",
    "Preppy is finding your success patterns...",
    "Preppy is discovering hidden correlations...",
    "Preppy is building your personal profile...",
    "Preppy is learning what works for you..."
  ]
} as const;

type LoadingType = keyof typeof LOADING_TEXTS;

interface UserContext {
  hasAllergies?: boolean;
  isVegetarian?: boolean;
  hasLowEnergy?: boolean;
  isNewUser?: boolean;
  currentGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
}

interface PreppyLoadingProps {
  type: LoadingType;
  duration?: number;
  className?: string;
  userContext?: UserContext;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PreppyLoading({ 
  type, 
  duration = 3000, 
  className,
  userContext,
  showProgress = false,
  size = 'md' 
}: PreppyLoadingProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Get contextual loading texts
  const getContextualTexts = () => {
    const baseTexts = [...LOADING_TEXTS[type]];
    const contextualTexts = [];

    if (userContext?.hasAllergies) {
      contextualTexts.push("Preppy is carefully avoiding your allergens...");
    }
    
    if (userContext?.isVegetarian) {
      contextualTexts.push("Preppy is focusing on plant-based options...");
    }
    
    if (userContext?.hasLowEnergy) {
      contextualTexts.push("Preppy is prioritizing energy-boosting foods...");
    }
    
    if (userContext?.isNewUser) {
      contextualTexts.push("Preppy is learning your preferences...");
    }

    if (userContext?.currentGoal === 'weight_loss') {
      contextualTexts.push("Preppy is optimizing for your weight loss goal...");
    } else if (userContext?.currentGoal === 'muscle_gain') {
      contextualTexts.push("Preppy is maximizing protein for muscle growth...");
    }

    // Time-based variations
    if (userContext?.timeOfDay === 'morning') {
      contextualTexts.push("Preppy is energizing your day...");
    } else if (userContext?.timeOfDay === 'evening') {
      contextualTexts.push("Preppy is winding down with you...");
    }

    return [...baseTexts, ...contextualTexts];
  };

  const texts = getContextualTexts();
  
  // Text rotation effect
  useEffect(() => {
    const changeInterval = Math.max(duration / texts.length, 800);
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    }, changeInterval);

    return () => clearInterval(interval);
  }, [duration, texts.length]);

  // Progress bar effect
  useEffect(() => {
    if (!showProgress) return;
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 1, 100));
    }, duration / 100);
    
    return () => clearInterval(progressInterval);
  }, [duration, showProgress]);

  // Size configurations
  const sizeConfig = {
    sm: {
      avatar: 'w-12 h-12',
      bot: 'w-6 h-6',
      spinner: 'w-4 h-4',
      text: 'text-sm',
      dot: 'w-1.5 h-1.5'
    },
    md: {
      avatar: 'w-16 h-16',
      bot: 'w-8 h-8',
      spinner: 'w-6 h-6',
      text: 'text-base',
      dot: 'w-2 h-2'
    },
    lg: {
      avatar: 'w-20 h-20',
      bot: 'w-10 h-10',
      spinner: 'w-8 h-8',
      text: 'text-lg',
      dot: 'w-3 h-3'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      {/* Preppy Avatar with breathing animation */}
      <div className="relative mb-6">
        <div className={cn(
          "bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center animate-pulse border border-muted",
          config.avatar
        )}>
          <Bot className={cn("text-primary", config.bot)} />
        </div>
        <Loader2 className={cn(
          "text-accent animate-spin absolute -bottom-1 -right-1",
          config.spinner
        )} />
      </div>
      
      {/* Loading text */}
      <div className="text-center max-w-md">
        <p className={cn(
          "font-medium text-gray-700 animate-pulse mb-4",
          config.text
        )}>
          {texts[currentTextIndex]}
        </p>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mb-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "bg-primary rounded-full animate-bounce",
                config.dot
              )}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Legacy wrapper for backward compatibility
export function PreppyLoadingText(props: PreppyLoadingProps) {
  return <PreppyLoading {...props} />;
}