"use client";

import { useState, useEffect } from 'react';
import { Loader2, Bot, Heart, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PreppyLoading, type PreppyLoadingProps } from './preppy-loading';

// Enhanced user context interface
interface EnhancedUserContext {
  // Basic context
  hasAllergies?: boolean;
  isVegetarian?: boolean;
  hasLowEnergy?: boolean;
  isNewUser?: boolean;
  currentGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance';
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  
  // Advanced context
  dietType?: 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'omnivore';
  allergens?: string[];
  preferredMacroSplit?: 'balanced' | 'high_protein' | 'low_carb' | 'high_carb';
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  moodToday?: 'motivated' | 'tired' | 'stressed' | 'happy' | 'neutral';
  weekendMode?: boolean;
  hasCookingTime?: boolean;
  preferredCuisines?: string[];
  avoidedFoods?: string[];
}

// Mood-based loading personalities
const MOOD_BASED_TEXTS = {
  encouraging: {
    'meal-plan': [
      "Preppy is cheering you on while calculating...",
      "Preppy believes you've got this covered...",
      "Preppy is excited about your progress...",
      "Preppy is crafting something you'll love...",
      "Preppy is making sure you stay motivated..."
    ],
    'weekly-analysis': [
      "Preppy is celebrating your wins...",
      "Preppy is finding all your improvements...",
      "Preppy is highlighting your consistency...",
      "Preppy is proud of your dedication..."
    ]
  },
  analytical: {
    'meal-plan': [
      "Preppy is running complex algorithms...",
      "Preppy is processing statistical models...",
      "Preppy is applying nutritional science...",
      "Preppy is calculating optimal ratios...",
      "Preppy is cross-referencing research data..."
    ],
    'data-analysis': [
      "Preppy is performing regression analysis...",
      "Preppy is computing correlation coefficients...",
      "Preppy is analyzing variance patterns...",
      "Preppy is running predictive models..."
    ]
  },
  playful: {
    'meal-plan': [
      "Preppy is playing nutritional Tetris...",
      "Preppy is conducting a symphony of flavors...",
      "Preppy is painting with macronutrients...",
      "Preppy is solving the delicious puzzle...",
      "Preppy is choreographing your meals..."
    ],
    'recipe': [
      "Preppy is mixing culinary magic...",
      "Preppy is stirring up something special...",
      "Preppy is sprinkling flavor combinations...",
      "Preppy is whipping up creativity..."
    ]
  }
};

// Time-of-day specific loading texts
const TIME_BASED_TEXTS = {
  morning: [
    "Preppy is energizing your day...",
    "Preppy is jumpstarting your metabolism...",
    "Preppy is crafting your sunrise nutrition...",
    "Preppy is brewing up breakfast brilliance..."
  ],
  afternoon: [
    "Preppy is sustaining your afternoon energy...",
    "Preppy is balancing your midday needs...",
    "Preppy is preventing the afternoon slump...",
    "Preppy is keeping you powered through..."
  ],
  evening: [
    "Preppy is winding down with you...",
    "Preppy is preparing restorative nutrition...",
    "Preppy is crafting evening comfort...",
    "Preppy is setting you up for good sleep..."
  ],
  weekend: [
    "Preppy is planning weekend treats...",
    "Preppy is balancing fun and nutrition...",
    "Preppy is making weekends enjoyable...",
    "Preppy is adding some weekend magic..."
  ]
};

// Goal-specific loading texts
const GOAL_BASED_TEXTS = {
  weight_loss: [
    "Preppy is optimizing for fat loss...",
    "Preppy is maintaining your metabolism...",
    "Preppy is creating satisfying, low-calorie options...",
    "Preppy is keeping you full and energized..."
  ],
  muscle_gain: [
    "Preppy is maximizing protein synthesis...",
    "Preppy is timing nutrients for growth...",
    "Preppy is fueling your training sessions...",
    "Preppy is building your meal foundation..."
  ],
  maintenance: [
    "Preppy is maintaining your perfect balance...",
    "Preppy is sustaining your healthy lifestyle...",
    "Preppy is keeping you on track...",
    "Preppy is optimizing for consistency..."
  ]
};

interface ContextualPreppyLoadingProps extends Omit<PreppyLoadingProps, 'userContext'> {
  userContext?: EnhancedUserContext;
  personality?: 'encouraging' | 'analytical' | 'playful' | 'adaptive';
  showInsights?: boolean;
}

export function ContextualPreppyLoading({ 
  userContext,
  personality = 'adaptive',
  showInsights = false,
  ...props 
}: ContextualPreppyLoadingProps) {
  const [insight, setInsight] = useState<string>('');

  // Generate enhanced contextual texts
  const getEnhancedTexts = () => {
    const baseTexts = [...(MOOD_BASED_TEXTS.encouraging[props.type] || [])];
    const contextualTexts = [];

    // Add personality-based texts
    if (personality !== 'adaptive' && MOOD_BASED_TEXTS[personality]?.[props.type]) {
      contextualTexts.push(...MOOD_BASED_TEXTS[personality][props.type]);
    }

    // Add time-based texts
    if (userContext?.timeOfDay && TIME_BASED_TEXTS[userContext.timeOfDay]) {
      contextualTexts.push(...TIME_BASED_TEXTS[userContext.timeOfDay]);
    }

    if (userContext?.weekendMode && TIME_BASED_TEXTS.weekend) {
      contextualTexts.push(...TIME_BASED_TEXTS.weekend);
    }

    // Add goal-based texts
    if (userContext?.currentGoal && GOAL_BASED_TEXTS[userContext.currentGoal]) {
      contextualTexts.push(...GOAL_BASED_TEXTS[userContext.currentGoal]);
    }

    // Diet-specific texts
    if (userContext?.dietType === 'vegetarian') {
      contextualTexts.push("Preppy is curating plant-based perfection...");
    } else if (userContext?.dietType === 'keto') {
      contextualTexts.push("Preppy is keeping you in ketosis...");
    } else if (userContext?.dietType === 'paleo') {
      contextualTexts.push("Preppy is channeling ancestral wisdom...");
    }

    // Allergy-specific texts
    if (userContext?.allergens?.length) {
      contextualTexts.push(`Preppy is avoiding your ${userContext.allergens.length} allergens...`);
    }

    // Fitness level texts
    if (userContext?.fitnessLevel === 'beginner') {
      contextualTexts.push("Preppy is making this beginner-friendly...");
    } else if (userContext?.fitnessLevel === 'advanced') {
      contextualTexts.push("Preppy is optimizing for peak performance...");
    }

    // Mood-based texts
    if (userContext?.moodToday === 'tired') {
      contextualTexts.push("Preppy is boosting your energy naturally...");
    } else if (userContext?.moodToday === 'motivated') {
      contextualTexts.push("Preppy is matching your high energy...");
    } else if (userContext?.moodToday === 'stressed') {
      contextualTexts.push("Preppy is finding comfort foods for you...");
    }

    // Cooking time consideration
    if (userContext?.hasCookingTime === false) {
      contextualTexts.push("Preppy is prioritizing quick meals...");
    }

    // Cuisine preferences
    if (userContext?.preferredCuisines?.length) {
      contextualTexts.push(`Preppy is exploring your favorite ${userContext.preferredCuisines[0]} flavors...`);
    }

    return [...baseTexts, ...contextualTexts];
  };

  // Generate insights based on user context
  useEffect(() => {
    if (!showInsights || !userContext) return;

    const insights = [];
    
    if (userContext.isNewUser) {
      insights.push("💡 Tip: Preppy learns your preferences over time!");
    }
    
    if (userContext.currentGoal === 'weight_loss') {
      insights.push("🎯 Focus: Creating a sustainable calorie deficit");
    } else if (userContext.currentGoal === 'muscle_gain') {
      insights.push("💪 Focus: Optimizing protein timing and quantity");
    }
    
    if (userContext.moodToday === 'stressed') {
      insights.push("🧘 Consider: Foods rich in magnesium can help with stress");
    }
    
    if (userContext.timeOfDay === 'morning') {
      insights.push("☀️ Morning: Starting with protein helps stabilize blood sugar");
    }

    if (insights.length > 0) {
      setInsight(insights[Math.floor(Math.random() * insights.length)]);
    }
  }, [userContext, showInsights]);

  // Determine personality icon
  const getPersonalityIcon = () => {
    switch (personality) {
      case 'encouraging': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'analytical': return <Target className="w-4 h-4 text-blue-500" />;
      case 'playful': return <Zap className="w-4 h-4 text-yellow-500" />;
      default: return <Bot className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <PreppyLoading 
        {...props} 
        userContext={userContext}
        className={cn("relative", props.className)}
      />
      
      {/* Personality indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        {getPersonalityIcon()}
        <span className="capitalize">{personality} Preppy</span>
      </div>
      
      {/* Contextual insight */}
      {showInsights && insight && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 text-center">
          {insight}
        </div>
      )}
    </div>
  );
}

// Smart loading component that adapts to context
export function SmartPreppyLoading(props: ContextualPreppyLoadingProps) {
  const [adaptedPersonality, setAdaptedPersonality] = useState<'encouraging' | 'analytical' | 'playful'>('encouraging');

  useEffect(() => {
    if (props.personality !== 'adaptive') return;

    // Adapt personality based on context
    if (props.userContext?.moodToday === 'motivated') {
      setAdaptedPersonality('encouraging');
    } else if (props.userContext?.fitnessLevel === 'advanced') {
      setAdaptedPersonality('analytical');
    } else if (props.userContext?.weekendMode) {
      setAdaptedPersonality('playful');
    } else if (props.type === 'data-analysis') {
      setAdaptedPersonality('analytical');
    } else {
      setAdaptedPersonality('encouraging');
    }
  }, [props.userContext, props.personality, props.type]);

  return (
    <ContextualPreppyLoading 
      {...props} 
      personality={props.personality === 'adaptive' ? adaptedPersonality : props.personality}
    />
  );
}