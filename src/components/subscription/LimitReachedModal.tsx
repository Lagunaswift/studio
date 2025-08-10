"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Zap,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscriptionLimits';
import { usageTracker } from '@/utils/usageTracker';
import { MiniUpgradeButton } from './CheckoutButton';
import { useRouter } from 'next/navigation';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  limitType: 'aiRequest' | 'recipe' | 'mealPlan';
  currentTier: SubscriptionTier;
  usageInfo?: {
    current: number;
    limit: number;
    period?: string;
  };
}

export function LimitReachedModal({
  isOpen,
  onClose,
  userId,
  limitType,
  currentTier,
  usageInfo
}: LimitReachedModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const router = useRouter();
  
  const currentLimits = SUBSCRIPTION_LIMITS[currentTier];
  const premiumLimits = SUBSCRIPTION_LIMITS.premium;
  const usageSummary = usageTracker.getUsageSummary(userId);
  
  const getLimitTitle = () => {
    switch (limitType) {
      case 'aiRequest':
        return 'AI Request Limit Reached';
      case 'recipe':
        return 'Recipe Limit Reached';
      case 'mealPlan':
        return 'Meal Plan Limit Reached';
      default:
        return 'Usage Limit Reached';
    }
  };
  
  const getLimitDescription = () => {
    const { current, limit, period } = usageInfo || {};
    switch (limitType) {
      case 'aiRequest':
        return `You've used ${current || 0} of your ${limit || currentLimits.aiRequestsPerDay} AI requests ${period || 'today'}. Upgrade to Premium for ${premiumLimits.aiRequestsPerDay} requests per day!`;
      case 'recipe':
        return `You've reached your limit of ${limit || currentLimits.maxRecipes} saved recipes. Upgrade to Premium for unlimited recipes!`;
      case 'mealPlan':
        return `You've used ${current || 0} of your ${limit || currentLimits.mealPlanDaysPerMonth} meal planning days this month. Upgrade to Premium for unlimited meal planning!`;
      default:
        return 'You\'ve reached your usage limit. Upgrade to Premium for unlimited access!';
    }
  };
  
  const getProgressPercentage = () => {
    if (!usageInfo) return 100;
    return Math.min((usageInfo.current / usageInfo.limit) * 100, 100);
  };
  
  const handleUpgrade = async () => {
    onClose();
    router.push('/upgrade');
  };

  const handleUpgradeSuccess = () => {
    onClose();
  };

  const resetLimitsForTesting = () => {
    if (process.env.NODE_ENV === 'development') {
      usageTracker.resetUsage(userId);
      onClose();
      window.location.reload();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <XCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {getLimitTitle()}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {getLimitDescription()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Usage Progress */}
        {usageInfo && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage Progress</span>
              <span className="font-medium">
                {usageInfo.current} / {usageInfo.limit === -1 ? '∞' : usageInfo.limit}
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        )}

        {/* Current Usage Overview */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Your Current Usage</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <div>
                <p className="font-medium">{usageSummary.today.aiRequests}</p>
                <p className="text-xs text-muted-foreground">AI requests today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="font-medium">{usageSummary.thisMonth.aiRequests}</p>
                <p className="text-xs text-muted-foreground">AI requests this month</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <div>
                <p className="font-medium">{usageSummary.total.recipes}</p>
                <p className="text-xs text-muted-foreground">Total recipes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div>
                <p className="font-medium">{usageSummary.thisMonth.mealPlanDays}</p>
                <p className="text-xs text-muted-foreground">Meal plan days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Benefits */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-purple-900 dark:text-purple-100">
              Premium Benefits
            </h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>{premiumLimits.aiRequestsPerDay} AI requests per day ({premiumLimits.aiRequestsPerMonth}/month)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Unlimited recipe storage</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Unlimited meal planning</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Advanced AI features</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Priority support</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetLimitsForTesting}
              className="text-xs"
            >
              Reset Limits (Dev)
            </Button>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
              Maybe Later
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={handleUpgrade} 
                variant="outline"
                className="flex-1 sm:flex-initial"
              >
                View Plans
              </Button>
              <MiniUpgradeButton 
                className="flex-1 sm:flex-initial bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onSuccess={handleUpgradeSuccess}
              />
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage
export function useLimitReachedModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    userId: string;
    limitType: 'aiRequest' | 'recipe' | 'mealPlan';
    currentTier: SubscriptionTier;
    usageInfo?: {
      current: number;
      limit: number;
      period?: string;
    };
  } | null>(null);

  const showLimitModal = (props: Omit<typeof modalState, 'isOpen'>) => {
    setModalState({ ...props, isOpen: true });
  };

  const closeLimitModal = () => {
    setModalState(null);
  };

  const LimitModal = modalState ? (
    <LimitReachedModal
      isOpen={modalState.isOpen}
      onClose={closeLimitModal}
      userId={modalState.userId}
      limitType={modalState.limitType}
      currentTier={modalState.currentTier}
      usageInfo={modalState.usageInfo}
    />
  ) : null;

  return {
    showLimitModal,
    closeLimitModal,
    LimitModal,
  };
}