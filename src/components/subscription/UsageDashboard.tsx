"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Crown,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/config/subscriptionLimits';
import { usageTracker } from '@/utils/usageTracker';
import { getUserTier, getUsagePercentage } from '@/utils/subscriptionHelpers';
import { UserProfileSettings } from '@/types';

interface UsageDashboardProps {
  userId: string;
  userProfile?: UserProfileSettings;
  onUpgradeClick?: () => void;
  defaultCollapsed?: boolean;
}

export function UsageDashboard({ userId, userProfile, onUpgradeClick, defaultCollapsed = false }: UsageDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const tier = getUserTier(userProfile);
  const limits = SUBSCRIPTION_LIMITS[tier];
  const usageSummary = usageTracker.getUsageSummary(userId);
  
  const usageStats = useMemo(() => {
    const aiDailyPercent = limits.aiRequestsPerDay === -1 ? 0 : 
      (usageSummary.today.aiRequests / limits.aiRequestsPerDay) * 100;
    const aiMonthlyPercent = limits.aiRequestsPerMonth === -1 ? 0 :
      (usageSummary.thisMonth.aiRequests / limits.aiRequestsPerMonth) * 100;
    const recipePercent = limits.maxRecipes === -1 ? 0 :
      (usageSummary.total.recipes / limits.maxRecipes) * 100;
    const mealPlanPercent = limits.mealPlanDaysPerMonth === -1 ? 0 :
      (usageSummary.thisMonth.mealPlanDays / limits.mealPlanDaysPerMonth) * 100;
    
    return {
      aiDaily: Math.min(aiDailyPercent, 100),
      aiMonthly: Math.min(aiMonthlyPercent, 100),
      recipes: Math.min(recipePercent, 100),
      mealPlan: Math.min(mealPlanPercent, 100),
    };
  }, [usageSummary, limits]);
  
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    return 'text-green-600';
  };
  
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getHighestUsagePercentage = () => {
    return Math.max(usageStats.aiDaily, usageStats.aiMonthly, usageStats.recipes, usageStats.mealPlan);
  };

  const getUsageStatus = () => {
    const highest = getHighestUsagePercentage();
    if (highest >= 90) return { color: 'text-red-600', icon: AlertTriangle, text: 'High Usage' };
    if (highest >= 75) return { color: 'text-orange-600', icon: AlertTriangle, text: 'Moderate Usage' };
    return { color: 'text-green-600', icon: CheckCircle, text: 'Normal Usage' };
  };

  const status = getUsageStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="w-full">
      {/* Collapsible Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg font-semibold">Usage & Limits</CardTitle>
            <Badge variant={tier === 'premium' ? 'default' : 'secondary'} className="flex items-center gap-1">
              {tier === 'premium' && <Crown className="w-3 h-3" />}
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Compact Status Indicator */}
            <div className={`flex items-center gap-1 text-sm ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="font-medium">{status.text}</span>
            </div>
            
            {tier === 'free' && !isCollapsed && (
              <Button onClick={onUpgradeClick} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
        
        {/* Collapsed Summary */}
        {isCollapsed && (
          <div className="mt-2">
            <CardDescription className="flex items-center justify-between">
              <span>Today: {usageSummary.today.aiRequests} AI requests</span>
              <span>Recipes: {usageSummary.total.recipes} saved</span>
            </CardDescription>
          </div>
        )}
      </CardHeader>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <CardContent className="space-y-6">

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Requests - Daily */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base">Daily AI Requests</CardTitle>
              </div>
              <div className={`flex items-center gap-1 text-sm ${getStatusColor(usageStats.aiDaily)}`}>
                {getStatusIcon(usageStats.aiDaily)}
                <span className="font-medium">
                  {usageSummary.today.aiRequests} / {limits.aiRequestsPerDay === -1 ? '∞' : limits.aiRequestsPerDay}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={usageStats.aiDaily} className="mb-2" />
            <CardDescription>
              {limits.aiRequestsPerDay === -1 
                ? 'Unlimited AI requests per day'
                : `${limits.aiRequestsPerDay - usageSummary.today.aiRequests} requests remaining today`
              }
            </CardDescription>
          </CardContent>
        </Card>

        {/* AI Requests - Monthly */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <CardTitle className="text-base">Monthly AI Requests</CardTitle>
              </div>
              <div className={`flex items-center gap-1 text-sm ${getStatusColor(usageStats.aiMonthly)}`}>
                {getStatusIcon(usageStats.aiMonthly)}
                <span className="font-medium">
                  {usageSummary.thisMonth.aiRequests} / {limits.aiRequestsPerMonth === -1 ? '∞' : limits.aiRequestsPerMonth}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={usageStats.aiMonthly} className="mb-2" />
            <CardDescription>
              {limits.aiRequestsPerMonth === -1 
                ? 'Unlimited AI requests per month'
                : `${limits.aiRequestsPerMonth - usageSummary.thisMonth.aiRequests} requests remaining this month`
              }
            </CardDescription>
          </CardContent>
        </Card>

        {/* Saved Recipes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base">Saved Recipes</CardTitle>
              </div>
              <div className={`flex items-center gap-1 text-sm ${getStatusColor(usageStats.recipes)}`}>
                {getStatusIcon(usageStats.recipes)}
                <span className="font-medium">
                  {usageSummary.total.recipes} / {limits.maxRecipes === -1 ? '∞' : limits.maxRecipes}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={usageStats.recipes} className="mb-2" />
            <CardDescription>
              {limits.maxRecipes === -1 
                ? 'Unlimited recipe storage'
                : `${Math.max(0, limits.maxRecipes - usageSummary.total.recipes)} recipe slots remaining`
              }
            </CardDescription>
          </CardContent>
        </Card>

        {/* Meal Plan Days */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base">Meal Plan Days</CardTitle>
              </div>
              <div className={`flex items-center gap-1 text-sm ${getStatusColor(usageStats.mealPlan)}`}>
                {getStatusIcon(usageStats.mealPlan)}
                <span className="font-medium">
                  {usageSummary.thisMonth.mealPlanDays} / {limits.mealPlanDaysPerMonth === -1 ? '∞' : limits.mealPlanDaysPerMonth}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={usageStats.mealPlan} className="mb-2" />
            <CardDescription>
              {limits.mealPlanDaysPerMonth === -1 
                ? 'Unlimited meal planning'
                : `${Math.max(0, limits.mealPlanDaysPerMonth - usageSummary.thisMonth.mealPlanDays)} planning days remaining this month`
              }
            </CardDescription>
          </CardContent>
        </Card>
      </div>

          {/* Premium Benefits */}
          {tier === 'free' && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-purple-900 dark:text-purple-100">
                    Unlock Premium Benefits
                  </CardTitle>
                </div>
                <CardDescription className="text-purple-700 dark:text-purple-300">
                  Upgrade to get unlimited access and advanced features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{SUBSCRIPTION_LIMITS.premium.aiRequestsPerDay} AI requests/day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Unlimited recipes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Unlimited meal planning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Advanced AI features</span>
                  </div>
                </div>
                <Button 
                  onClick={onUpgradeClick} 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium - $9.99/month
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Development Reset */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="border-dashed border-orange-300">
              <CardHeader>
                <CardTitle className="text-sm text-orange-600">Development Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    usageTracker.resetUsage(userId);
                    window.location.reload();
                  }}
                >
                  Reset All Usage
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      )}
    </Card>
  );
}