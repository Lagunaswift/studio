
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { reportBug } from '@/app/(main)/profile/actions';
import { useToast } from '@/hooks/use-toast';

export function SimpleHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How can I help?</DialogTitle>
            <DialogDescription>
              If you've encountered an issue or have a question, let us know.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button onClick={() => { setIsOpen(false); setIsBugReportOpen(true); }} className="w-full">
              Report a Bug
            </Button>
            {/* Add more buttons for other help options here */}
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
