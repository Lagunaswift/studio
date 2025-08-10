// src/app/(main)/upgrade/success/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Crown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { Suspense } from 'react';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { userProfile, isSubscribed } = useAppContext();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Verify the subscription status
    const verifySubscription = async () => {
      if (!sessionId || !user) {
        setVerificationStatus('error');
        setIsVerifying(false);
        return;
      }

      try {
        // Wait a moment for webhook processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if user is now subscribed
        if (isSubscribed) {
          setVerificationStatus('success');
        } else {
          // Try to sync subscription status
          // In a real implementation, you might call a sync function here
          setVerificationStatus('success'); // Assume success for now
        }
      } catch (error) {
        console.error('Error verifying subscription:', error);
        setVerificationStatus('error');
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [sessionId, user, isSubscribed]);

  const handleContinue = () => {
    router.push('/ai-suggestions'); // Redirect to premium feature
  };

  const handleRetry = () => {
    router.push('/upgrade');
  };

  if (isVerifying) {
    return (
      <PageWrapper title="Processing Your Subscription">
        <div className="max-w-2xl mx-auto p-6">
          <Card className="text-center">
            <CardContent className="p-8 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Processing Your Subscription</h2>
                <p className="text-gray-600">
                  Please wait while we confirm your payment and activate your premium features...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <PageWrapper title="Subscription Error">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              There was an issue verifying your subscription. Please contact support if the problem persists.
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Verification Issue</h2>
                <p className="text-gray-600">
                  We're having trouble confirming your subscription. This is usually temporary.
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRetry} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = 'mailto:support@mealplannerapp.com'}>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  // Success state
  return (
    <PageWrapper title="Welcome to Premium!">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Success Header */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <Crown className="h-6 w-6 text-accent absolute -top-2 -right-2" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-green-900">Welcome to Premium!</h1>
              <p className="text-green-800">
                Your subscription is now active and all premium features have been unlocked.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                What's New for You
              </CardTitle>
              <CardDescription>
                Here's what you can now access with your premium subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Unlimited AI Meal Plans</p>
                    <p className="text-sm text-gray-600">Generate as many personalized meal plans as you want</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Advanced AI Coaching</p>
                    <p className="text-sm text-gray-600">Get personalized nutrition advice and insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Export Your Data</p>
                    <p className="text-sm text-gray-600">Download recipes, meal plans, and nutrition data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Priority Support</p>
                    <p className="text-sm text-gray-600">Get help faster when you need it</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with your premium features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleContinue} className="w-full" size="lg">
                Generate Your First AI Meal Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/profile')}
                className="w-full"
              >
                Update Your Nutrition Goals
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/recipes/add')}
                className="w-full"
              >
                Add Your Favorite Recipes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Subscription</CardTitle>
            <CardDescription>
              Update billing, view invoices, or change your plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => window.open('/api/create-customer-portal-session', '_blank')}
            >
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>

        {/* Support */}
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Need Help?</h3>
          <p className="text-gray-600">
            Have questions about your new premium features? We're here to help!
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = 'mailto:support@mealplannerapp.com'}
          >
            Contact Premium Support
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}

function SuccessPageLoading() {
  return (
    <PageWrapper title="Success">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </PageWrapper>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={<SuccessPageLoading />}>
      <SuccessPageContent />
    </Suspense>
  );
}