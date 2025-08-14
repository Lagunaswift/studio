"use client";

import { useState, useEffect } from 'react';
import { Loader2, Bot, Sparkles, Heart, Zap, Target, Brain, Coffee, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PreppyLoading, type PreppyLoadingProps } from './preppy-loading';

interface EnhancedLoadingProps extends PreppyLoadingProps {
  variant?: 'default' | 'premium' | 'particles' | 'glow';
  showParticles?: boolean;
  showInsights?: boolean;
  pulseColor?: 'purple' | 'teal' | 'gold' | 'blue' | 'green';
}

export function EnhancedPreppyLoading({ 
  variant = 'default',
  showParticles = false,
  showInsights = false,
  pulseColor = 'purple',
  className,
  ...props 
}: EnhancedLoadingProps) {
  const [currentInsight, setCurrentInsight] = useState('');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  const colorClasses = {
    purple: {
      gradient: 'from-muted to-muted/50',
      text: 'text-primary',
      border: 'border-muted',
      bg: 'bg-muted/20',
      particle: 'bg-primary/60'
    },
    teal: {
      gradient: 'from-muted to-muted/50',
      text: 'text-primary',
      border: 'border-muted',
      bg: 'bg-muted/20',
      particle: 'bg-primary/60'
    },
    gold: {
      gradient: 'from-muted to-muted/50',
      text: 'text-accent',
      border: 'border-muted',
      bg: 'bg-muted/20',
      particle: 'bg-accent/60'
    },
    blue: {
      gradient: 'from-muted to-muted/50',
      text: 'text-primary',
      border: 'border-muted',
      bg: 'bg-muted/20',
      particle: 'bg-primary/60'
    },
    green: {
      gradient: 'from-muted to-muted/50',
      text: 'text-foreground',
      border: 'border-muted',
      bg: 'bg-muted/20',
      particle: 'bg-muted-foreground/60'
    }
  };

  const colors = colorClasses[pulseColor];

  // Generate insights based on loading type and context
  const insights = {
    'meal-plan': [
      "💡 Meal planning saves 4+ hours per week on average",
      "🎯 Balanced macros improve energy levels throughout the day",
      "🍽️ Planning ahead reduces food waste by up to 40%",
      "⚡ Consistent meal timing optimizes metabolic function"
    ],
    'weekly-analysis': [
      "📊 Progress tracking increases success rates by 70%",
      "🔄 Weekly check-ins help identify patterns faster",
      "🎯 Small consistent changes compound over time",
      "📈 Data-driven decisions lead to better outcomes"
    ],
    'recipe': [
      "🥘 Batch cooking can save 3+ hours weekly",
      "🌱 Home cooking reduces sodium intake by 40%",
      "💰 Meal prep saves $200+ monthly on average",
      "🎨 Cooking variety prevents diet boredom"
    ],
    'chat': [
      "🤖 AI coaching provides 24/7 personalized support",
      "💬 Quick questions get instant expert guidance",
      "🎯 Tailored advice fits your unique lifestyle",
      "🧠 Learning from interactions improves recommendations"
    ],
    'data-analysis': [
      "📊 Pattern recognition reveals hidden insights",
      "🔍 Data analysis identifies optimization opportunities",
      "📈 Trend analysis predicts future success factors",
      "⚖️ Correlations help balance multiple health metrics"
    ]
  };

  // Generate floating particles
  useEffect(() => {
    if (!showParticles) return;
    
    const particleArray = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 300,
      y: Math.random() * 200,
      delay: Math.random() * 3
    }));
    
    setParticles(particleArray);
  }, [showParticles]);

  // Show one random insight per AI call (no rotation)
  useEffect(() => {
    if (!showInsights) return;
    
    const typeInsights = insights[props.type] || insights.chat;
    // Pick one random insight and stick with it for this AI call
    const randomInsight = typeInsights[Math.floor(Math.random() * typeInsights.length)];
    setCurrentInsight(randomInsight);
  }, [props.type, showInsights]);

  // Get contextual icon based on loading type
  const getContextIcon = () => {
    switch (props.type) {
      case 'meal-plan': return <Sparkles className="w-5 h-5" />;
      case 'weekly-analysis': return <Brain className="w-5 h-5" />;
      case 'recipe': return <Coffee className="w-5 h-5" />;
      case 'data-analysis': return <Target className="w-5 h-5" />;
      case 'chat': return <Heart className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const renderVariant = () => {
    switch (variant) {
      case 'premium':
        return (
          <div className={cn("relative preppy-particle-container", className)}>
            {/* Floating particles */}
            {showParticles && particles.map((particle) => (
              <div
                key={particle.id}
                className={cn("preppy-particle", colors.particle)}
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  animationDelay: `${particle.delay}s`
                }}
              />
            ))}
            
            {/* Main content */}
            <div className="relative z-10">
              <PreppyLoading {...props} className="preppy-breathing" />
            </div>
          </div>
        );
        
      case 'glow':
        return (
          <div className={cn("preppy-glow", className)}>
            <PreppyLoading {...props} />
          </div>
        );
        
      case 'particles':
        return (
          <div className={cn("preppy-particle-container", className)}>
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn("absolute rounded-full opacity-30", colors.particle)}
                  style={{
                    width: `${Math.random() * 8 + 4}px`,
                    height: `${Math.random() * 8 + 4}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${Math.random() * 2 + 3}s`
                  }}
                  className={cn(colors.particle, "preppy-float opacity-30")}
                />
              ))}
            </div>
            <div className="relative z-10">
              <PreppyLoading {...props} />
            </div>
          </div>
        );
        
      default:
        return <PreppyLoading {...props} className={className} />;
    }
  };

  return (
    <div className="space-y-6">
      {renderVariant()}
      
      {/* Enhanced status indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm", colors.bg, colors.border, "border")}>
          <div className={cn("flex items-center gap-1", colors.text)}>
            {getContextIcon()}
            <span className="font-medium">
              {props.type === 'meal-plan' && 'Planning'}
              {props.type === 'weekly-analysis' && 'Analyzing'}
              {props.type === 'recipe' && 'Searching'}
              {props.type === 'data-analysis' && 'Computing'}
              {props.type === 'chat' && 'Thinking'}
            </span>
          </div>
          
          {/* Animated progress dots */}
          <div className="flex gap-1">
            <div className={cn("w-1.5 h-1.5 rounded-full preppy-dots-wave-1", colors.particle)} />
            <div className={cn("w-1.5 h-1.5 rounded-full preppy-dots-wave-2", colors.particle)} />
            <div className={cn("w-1.5 h-1.5 rounded-full preppy-dots-wave-3", colors.particle)} />
          </div>
        </div>
      </div>
      
      {/* Contextual insight */}
      {showInsights && currentInsight && (
        <div className={cn(
          "text-center p-4 rounded-lg transition-all duration-500",
          colors.bg,
          colors.border,
          "border shadow-sm"
        )}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className={cn("w-4 h-4", colors.text)} />
            <span className={cn("text-sm font-medium", colors.text)}>Did you know?</span>
          </div>
          <p className="text-sm text-gray-600 animate-pulse">
            {currentInsight}
          </p>
        </div>
      )}
    </div>
  );
}

// Specialized loading components for different contexts
export function MealPlanLoading(props: Omit<EnhancedLoadingProps, 'type'> & { duration?: number }) {
  return (
    <EnhancedPreppyLoading 
      {...props} 
      type="meal-plan" 
      variant="premium"
      showParticles 
      showInsights
      pulseColor="purple"
    />
  );
}

export function WeeklyAnalysisLoading(props: Omit<EnhancedLoadingProps, 'type'> & { duration?: number }) {
  return (
    <EnhancedPreppyLoading 
      {...props} 
      type="weekly-analysis"
      variant="glow"
      showInsights
      pulseColor="blue"
    />
  );
}

export function RecipeSearchLoading(props: Omit<EnhancedLoadingProps, 'type'> & { duration?: number }) {
  return (
    <EnhancedPreppyLoading 
      {...props} 
      type="recipe"
      variant="particles"
      pulseColor="teal"
    />
  );
}

export function ChatThinkingLoading(props: Omit<EnhancedLoadingProps, 'type'> & { duration?: number }) {
  return (
    <EnhancedPreppyLoading 
      {...props} 
      type="chat"
      variant="default"
      pulseColor="green"
      size="sm"
    />
  );
}