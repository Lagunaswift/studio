"use client";

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { reportBug } from '@/app/(main)/profile/actions';
import { Megaphone, Bug, CheckCircle, Lightbulb, Loader2, Send } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


export default function UpdatesAndFeedbackPage() {
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const handleBugSubmit = async () => {
    if (!bugDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe the bug before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const result = await reportBug(bugDescription);
      if (result.error) {
        throw new Error(result.error);
      }
      setSubmissionResult({ success: true, message: "Thank you! Your bug report has been submitted and categorized by our AI." });
      setBugDescription('');
    } catch (error: any) {
      setSubmissionResult({ success: false, message: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper title="Updates & Feedback">
      <div className="grid md:grid-cols-2 gap-8">
        {/* What's New Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <Megaphone className="w-6 h-6 mr-2 text-accent" />
              What's New & Upcoming
            </CardTitle>
            <CardDescription>
              Check out the latest updates and our roadmap for future features.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Version 1.0 - Initial Launch!</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li><span className="font-semibold text-primary">Core Functionality:</span> Recipe management, meal planning, and macro tracking are live.</li>
                        <li><span className="font-semibold text-primary">AI Features:</span> Preppy can generate meal plans, suggest recipes from your pantry, and tweak existing recipes.</li>
                        <li><span className="font-semibold text-primary">Firebase Migration:</span> The app is now fully powered by Firebase Authentication and Firestore for a secure and scalable experience.</li>
                        <li><span className="font-semibold text-primary">Pantry & Shopping List:</span> Keep track of your ingredients and automatically generate a shopping list.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Coming Soon...</AccordionTrigger>
                  <AccordionContent>
                     <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li><span className="font-semibold text-accent">Barcode Scanning:</span> Easily add pantry items and get nutritional information by scanning barcodes.</li>
                        <li><span className="font-semibold text-accent">Shared Recipe Books:</span> Collaborate on recipe collections with family and friends.</li>
                        <li><span className="font-semibold text-accent">Advanced Analytics:</span> Deeper insights into your nutritional trends and progress over time.</li>
                        <li><span className="font-semibold text-accent">Wearable Integrations:</span> Sync your activity data from popular fitness trackers.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
          </CardContent>
        </Card>

        {/* Bug Reporting Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary flex items-center">
              <Bug className="w-6 h-6 mr-2 text-destructive" />
              Report a Bug
            </CardTitle>
            <CardDescription>
              Found something that's not working right? Let us know! Our AI will analyze and categorize your report to help us fix it faster.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Please describe the bug in detail. What were you doing? What did you expect to happen? What actually happened?"
              rows={6}
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              disabled={isSubmitting}
            />
            {submissionResult && (
              <Alert variant={submissionResult.success ? 'default' : 'destructive'} className={submissionResult.success ? 'border-green-500' : ''}>
                {submissionResult.success ? <CheckCircle className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                <AlertTitle>{submissionResult.success ? 'Submission Successful' : 'Submission Failed'}</AlertTitle>
                <AlertDescription>{submissionResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleBugSubmit} disabled={isSubmitting || !bugDescription.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageWrapper>
  );
}
