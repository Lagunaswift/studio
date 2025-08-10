// src/app/(main)/upgrade/page.tsx
"use client";

import { useSearchParams } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { UpgradePage } from '@/components/subscription/UpgradePage';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function UpgradePageContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  const highlightPlan = searchParams.get('plan') === 'monthly' ? 'monthly' : 'yearly';

  return (
    <PageWrapper title="Upgrade to Premium">
      <UpgradePage 
        showCancelledMessage={canceled}
        highlightPlan={highlightPlan}
      />
    </PageWrapper>
  );
}

// Loading component for Suspense
function UpgradePageLoading() {
  return (
    <PageWrapper title="Upgrade to Premium">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-gray-600">Loading upgrade options...</p>
      </div>
    </PageWrapper>
  );
}

export default function UpgradePageRoute() {
  return (
    <Suspense fallback={<UpgradePageLoading />}>
      <UpgradePageContent />
    </Suspense>
  );
}