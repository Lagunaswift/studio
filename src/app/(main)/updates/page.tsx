
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
            <CardDescription>Latest updates and features added to MealPreppyPro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-accent">Version 0.1.0 - Production Launch</h3>
              <p className="text-sm text-muted-foreground mb-2">Current Release - August 2025</p>
              <div className="space-y-2 text-sm">
                <p><strong>🎉 App Status:</strong> Production Ready & Live</p>
                <p><strong>🏗️ Core Features:</strong></p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Complete meal planning system with 500+ built-in recipes</li>
                  <li>AI-powered Preppy Plan Generator (15 requests/day for premium)</li>
                  <li>AI Pantry Chef for ingredient-based recipe suggestions</li>
                  <li>Shopping list generator and pantry management</li>
                  <li>Daily check-in tracking (weight, vitals, macros)</li>
                  <li>Macro targets with science-based calculators</li>
                  <li>Progressive Web App (PWA) with offline capability</li>
                </ul>
                <p><strong>🔒 Security & Compliance:</strong></p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>Enterprise-grade security with DoS protection</li>
                  <li>GDPR-compliant account deletion and data export</li>
                  <li>Behavioral anomaly detection and monitoring</li>
                  <li>Token revocation and session management</li>
                </ul>
                <p><strong>💳 Subscription:</strong> Free tier with premium upgrade (£12.99/month, £129.99/year)</p>
              </div>
            </div>
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
