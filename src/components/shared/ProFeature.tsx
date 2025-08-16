
"use client";

import { UpgradePage } from "@/components/subscription/UpgradePage";

interface ProFeatureProps {
  featureName: string;
  description: string;
  hideWrapper?: boolean;
}

export function ProFeature({ featureName, description, hideWrapper = false }: ProFeatureProps) {
  return <UpgradePage highlightPlan="yearly" />;
}
