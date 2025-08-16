// src/app/api/create-customer-portal-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';
import { authenticateRequest, createAuthenticatedResponse } from '@/lib/auth-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Authenticate request
  const authResult = await authenticateRequest(request);
  const authError = createAuthenticatedResponse(authResult);
  if (authError) return authError;
  
  const userId = authResult.user?.uid;
  
  try {
    // Get the origin from headers
    const headersList = headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get user document from Firebase profiles collection to find Stripe customer ID
    const userDoc = await adminDb
      .collection('profiles')
      .doc(userId!)
      .get();

    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Check if user has active subscription but no Stripe customer
      if (userData?.subscription_status === 'active') {
        return NextResponse.json(
          { 
            error: 'Manual subscription detected',
            message: 'Your subscription was set up manually. Please contact support for subscription changes.',
            isManualSubscription: true
          },
          { status: 200 } // Not an error, just different flow
        );
      }
      
      return NextResponse.json(
        { error: 'No Stripe customer found. Please upgrade to a paid plan first.' },
        { status: 404 }
      );
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/upgrade`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating customer portal session:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}