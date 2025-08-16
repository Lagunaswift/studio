"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Loader2, 
  Wand2, 
  PlusCircle, 
  CheckCircle2, 
  Scale,
  BookOpen, 
  Bug,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { reportBug } from '@/app/(main)/profile/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function SimpleHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Quick Actions from Dashboard
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
      href: '/preppy-plan-generator',
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

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setIsOpen(true)} className="rounded-full w-14 h-14 shadow-lg">
          <Bot size={28} />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              Preppy Assistant
            </DialogTitle>
            <DialogDescription>
              Quick actions and help for MealPreppyPro
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {/* Quick Actions */}
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

            {/* Help & Support */}
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

export const PreppyHelp = SimpleHelpWidget;