
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function TermsAcceptanceModal({ isOpen, onAccept }: TermsAcceptanceModalProps) {
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
          <DialogTitle className="text-2xl font-headline text-primary">Welcome to Macro Teal Meal Planner!</DialogTitle>
          <DialogDescription className="pt-2">
            Before you get started, please review and accept our terms of use.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm text-foreground/80">
            <p>
                Our app provides tools and information for meal planning and is not a substitute for professional medical advice.
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
            disabled={!isChecked}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Continue to the App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
