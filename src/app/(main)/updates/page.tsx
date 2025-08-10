
"use client";

import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { reportBug } from '@/app/(main)/profile/actions';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function UpdatesPage() {
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
    <PageWrapper title="Updates & Feedback">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>What's New</CardTitle>
            <CardDescription>Latest updates and features added to MealPlannerPro.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* You can map over a list of updates here */}
            <p>Stay tuned for exciting new features!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback & Bug Reports</CardTitle>
            <CardDescription>
              Have a suggestion or encountered a bug? Let us know!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsBugReportOpen(true)}>Report a Bug</Button>
          </CardContent>
        </Card>
      </div>

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
    </PageWrapper>
  );
}
