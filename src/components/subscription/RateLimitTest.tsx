"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { optimizedSuggestRecipes } from '@/utils/aiOptimizer';
import { useLimitReachedModal } from './LimitReachedModal';
import { usageTracker } from '@/utils/usageTracker';
import { getUserTier } from '@/utils/subscriptionHelpers';
import { UserProfileSettings } from '@/types';

interface RateLimitTestProps {
  userId: string;
  userProfile?: UserProfileSettings;
}

export function RateLimitTest({ userId, userProfile }: RateLimitTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { showLimitModal, LimitModal } = useLimitReachedModal();
  
  const tier = getUserTier(userProfile);
  const usageSummary = usageTracker.getUsageSummary(userId);

  const testAIRequest = async () => {
    setIsLoading(true);
    setError('');
    setLastResult('');
    
    try {
      // Mock AI function for testing
      const mockAIFunction = () => new Promise(resolve => {
        setTimeout(() => resolve({ 
          result: 'Mock AI response',
          timestamp: new Date().toISOString() 
        }), 1000);
      });
      
      const result = await optimizedSuggestRecipes(
        userId,
        userProfile || { subscription_status: null } as UserProfileSettings,
        {
          userIngredients: ['chicken', 'rice'],
          availableRecipes: [],
          maxResults: 3
        }
      );
      
      setLastResult(`✅ Success: ${JSON.stringify(result, null, 2)}`);
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      
      // Check if it's a subscription limit error
      if (errorMessage.includes('limit') && errorMessage.includes('Upgrade')) {
        const usageInfo = {
          current: usageSummary.today.aiRequests,
          limit: tier === 'free' ? 10 : 150,
          period: 'today'
        };
        
        showLimitModal({
          userId,
          limitType: 'aiRequest',
          currentTier: tier,
          usageInfo
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const simulateMultipleRequests = async () => {
    setIsLoading(true);
    setError('');
    
    const results: string[] = [];
    
    for (let i = 0; i < 6; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        await optimizedSuggestRecipes(
          userId,
          userProfile || { subscription_status: null } as UserProfileSettings,
          { userIngredients: [`test-${i}`], availableRecipes: [], maxResults: 1 }
        );
        results.push(`Request ${i + 1}: ✅ Success`);
      } catch (err: any) {
        results.push(`Request ${i + 1}: ❌ ${err.message}`);
        break;
      }
    }
    
    setLastResult(results.join('\n'));
    setIsLoading(false);
  };

  const resetUsageForTesting = () => {
    usageTracker.resetUsage(userId);
    setError('');
    setLastResult('Usage reset successfully. You can now test limits again.');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Rate Limiting Test
          </CardTitle>
          <Badge variant={tier === 'premium' ? 'default' : 'secondary'}>
            {tier} tier
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Usage */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>Today's AI requests: <strong>{usageSummary.today.aiRequests}</strong></div>
            <div>Monthly AI requests: <strong>{usageSummary.thisMonth.aiRequests}</strong></div>
            <div>Total recipes: <strong>{usageSummary.total.recipes}</strong></div>
            <div>This month's meal plans: <strong>{usageSummary.thisMonth.mealPlanDays}</strong></div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={testAIRequest} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Testing...' : 'Test Single AI Request'}
          </Button>
          <Button 
            onClick={simulateMultipleRequests} 
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            Test Multiple Requests
          </Button>
        </div>

        {/* Results */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {lastResult && !error && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap font-mono text-xs">
              {lastResult}
            </AlertDescription>
          </Alert>
        )}

        {/* Development Reset */}
        {process.env.NODE_ENV === 'development' && (
          <div className="pt-4 border-t border-dashed">
            <Button 
              size="sm" 
              variant="outline"
              onClick={resetUsageForTesting}
              className="text-xs"
            >
              🔧 Reset Usage (Dev Only)
            </Button>
          </div>
        )}
        
        {/* Limit Modal */}
        {LimitModal}
      </CardContent>
    </Card>
  );
}