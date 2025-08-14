"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bot, 
  Loader2, 
  Wand2, 
  PlusCircle, 
  CheckCircle2, 
  Scale,
  BookOpen, 
  Bug,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Battery,
  Moon,
  Activity,
  Target
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOptimizedProfile } from '@/hooks/useOptimizedFirestore';
import { reportBug } from '@/app/(main)/profile/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useDailyInsights } from '@/hooks/useDailyInsights';

interface InsightData {
  type: 'energy' | 'weight' | 'plateau' | 'progress' | 'sleep' | 'protein';
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  priority: 'low' | 'medium' | 'high';
  actionText?: string;
  actionHref?: string;
}

export function ProgressiveAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { profile: userProfile } = useOptimizedProfile(user?.uid);
  const { toast } = useToast();
  const router = useRouter();
  const { todayInsight, isLoading: insightLoading } = useDailyInsights(user?.uid);

  // Show notification badge when there's a medium/high priority insight
  const hasHighPriorityInsight = todayInsight && ['medium', 'high'].includes(todayInsight.priority);

  // Quick Actions from original SimpleHelpWidget
  const quickActions = [
    {
      title: 'Add Recipe',
      description: 'Save a new recipe to your collection',
      icon: PlusCircle,
      href: '/recipes/add',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100'
    },
    {
      title: 'AI Meal Plan',
      description: 'Let Preppy create a personalized meal plan',
      icon: Wand2,
      href: '/ai-suggestions',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100',
      popular: true
    },
    {
      title: 'Shopping List',
      description: 'View and manage your shopping list',
      icon: CheckCircle2,
      href: '/shopping-list',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100'
    },
    {
      title: 'Daily Check-in',
      description: 'Log your weight and daily progress',
      icon: Scale,
      href: '/daily-check-in',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100'
    }
  ];

  const handleQuickAction = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleBugReportSubmit = async () => {
    if (!bugDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a description of the bug.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await reportBug(bugDescription, user?.uid || 'anonymous');
      if (result.success) {
        toast({
          title: 'Bug Report Submitted',
          description: 'Thank you for your feedback!',
        });
        setBugDescription('');
        setIsBugReportOpen(false);
      } else {
        throw new Error(result.error || 'Failed to submit bug report.');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInsightAction = () => {
    if (todayInsight?.actionHref) {
      setIsOpen(false);
      router.push(todayInsight.actionHref);
    }
  };

  return (
    <>
      {/* Widget Button with optional notification badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          <Button 
            onClick={() => setIsOpen(true)} 
            className="rounded-full w-14 h-14 shadow-lg relative"
          >
            <Bot size={28} />
          </Button>
          
          {/* Priority Insight Notification Badge */}
          {hasHighPriorityInsight && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              Preppy Assistant
            </DialogTitle>
            <DialogDescription>
              Your AI nutrition coach with personalized insights and quick actions
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {/* Daily AI Insight Section - New Whoop-style feature */}
            {todayInsight && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Today's Coach Insight
                  {todayInsight.priority === 'high' && (
                    <Badge variant="destructive" className="text-[10px]">Priority</Badge>
                  )}
                  {todayInsight.priority === 'medium' && (
                    <Badge variant="secondary" className="text-[10px]">Important</Badge>
                  )}
                </h3>
                
                <Card className={`border-2 ${
                  todayInsight.priority === 'high' ? 'border-red-200 bg-red-50/50' :
                  todayInsight.priority === 'medium' ? 'border-amber-200 bg-amber-50/50' :
                  'border-blue-200 bg-blue-50/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${todayInsight.color} flex-shrink-0 mt-1`}>
                        <todayInsight.icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-grow">
                        <h4 className="font-medium text-sm mb-1">{todayInsight.title}</h4>
                        <p className="text-xs text-gray-700 mb-3">{todayInsight.message}</p>
                        
                        {todayInsight.actionText && todayInsight.actionHref && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleInsightAction}
                            className="h-8 px-3 text-xs"
                          >
                            {todayInsight.actionText}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {insightLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing your progress patterns...
              </div>
            )}

            <Separator />

            {/* Quick Actions - Preserved from SimpleHelpWidget */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={action.href}
                      variant="outline"
                      className={`${action.bgColor} border-2 h-20 flex flex-col items-center justify-center gap-2 hover:border-gray-300 transition-all`}
                      onClick={() => handleQuickAction(action.href)}
                    >
                      <div className={`${action.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-medium text-gray-900">
                            {action.title}
                          </span>
                          {action.popular && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Hot
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Help & Support - Preserved from SimpleHelpWidget */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Help & Support
              </h3>
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-3 hover:bg-gray-50"
                  onClick={() => handleQuickAction('/guide')}
                >
                  <BookOpen className="w-5 h-5 mr-3 text-teal-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">App Guide</p>
                    <p className="text-xs text-gray-600">Learn how to use MealPreppyPro</p>
                  </div>
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-3 hover:bg-gray-50"
                  onClick={() => { setIsOpen(false); setIsBugReportOpen(true); }}
                >
                  <Bug className="w-5 h-5 mr-3 text-amber-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Report a Bug</p>
                    <p className="text-xs text-gray-600">Let us know if something isn't working</p>
                  </div>
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-3 hover:bg-gray-50"
                  onClick={() => handleQuickAction('/updates')}
                >
                  <Sparkles className="w-5 h-5 mr-3 text-yellow-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Updates & Feedback</p>
                    <p className="text-xs text-gray-600">See what's new and share your thoughts</p>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bug Report Modal - Preserved from SimpleHelpWidget */}
      <Dialog open={isBugReportOpen} onOpenChange={setIsBugReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a Bug</DialogTitle>
            <DialogDescription>
              Please describe the issue you're facing in as much detail as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="E.g., When I click the 'Save Recipe' button, the page crashes."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBugReportOpen(false)}>Cancel</Button>
            <Button onClick={handleBugReportSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const PreppyHelp = ProgressiveAIWidget;