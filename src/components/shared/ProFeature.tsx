
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from 'lucide-react';
import { useRouter } from "next/navigation";

interface ProFeatureProps {
  featureName: string;
  description: string;
  hideWrapper?: boolean;
}

export function ProFeature({ featureName, description, hideWrapper = false }: ProFeatureProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    // In a real app, this would link to your pricing/subscription page
    // For now, it will just show an alert.
    alert("Upgrade to Pro to unlock this feature!");
    // router.push('/pricing'); // Example of a future routing
  };
  
  const content = (
    <div className="text-center p-4 sm:p-6 md:p-8 flex flex-col items-center">
        <div className="bg-primary/10 p-4 rounded-full mb-4 border border-primary/20">
            <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-2">
            {featureName} is a Pro Feature
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mb-6">
            {description}
        </p>
        <Button onClick={handleUpgrade} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Zap className="mr-2 h-4 w-4" /> Upgrade to Pro
        </Button>
    </div>
  );

  if (hideWrapper) {
    return content;
  }

  return (
    <Card className="shadow-lg border-dashed border-accent">
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  );
}
