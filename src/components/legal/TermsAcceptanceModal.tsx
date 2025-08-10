
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Wand2, Loader2 } from 'lucide-react';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => void;
  isPending: boolean;
}

export function TermsAcceptanceModal({ isOpen, onAccept, isPending }: TermsAcceptanceModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-md" 
        hideCloseButton
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex flex-col items-center text-center">
            <div className="bg-accent/20 p-3 rounded-full mb-4">
              <Wand2 className="h-10 w-10 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-headline text-primary">Hello! I'm Preppy.</DialogTitle>
            <DialogDescription className="pt-2">
              I'm your AI-powered nutrition assistant. Before we begin, please review and accept the app's terms.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm text-foreground/80">
            <p>
                This app provides tools and information for meal planning but is not a substitute for professional medical advice.
            </p>
             <p>
                By checking the box below, you confirm that you are over 18 years old and agree to our 
                <Link href="/terms" target="_blank" className="font-semibold text-accent underline hover:text-accent/80 mx-1">
                    Terms of Service
                </Link> 
                and have read our
                <Link href="/privacy" target="_blank" className="font-semibold text-accent underline hover:text-accent/80 ml-1">
                    Privacy Policy
                </Link>.
            </p>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="terms-acceptance" 
            checked={isChecked} 
            onCheckedChange={(checked) => setIsChecked(checked as boolean)}
          />
          <label
            htmlFor="terms-acceptance"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and agree to the terms and policies.
          </label>
        </div>
        <DialogFooter>
          <Button 
            onClick={onAccept} 
            disabled={!isChecked || isPending}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue to the App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
