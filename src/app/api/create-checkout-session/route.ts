// src/app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, successUrl, cancelUrl, userId, userEmail } = body;

    // Validate required fields
    if (!priceId || !successUrl || !cancelUrl || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the origin from headers for security
    const headersList = headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl.startsWith('http') ? successUrl : `${origin}${successUrl}`,
      cancel_url: cancelUrl.startsWith('http') ? cancelUrl : `${origin}${cancelUrl}`,
      customer_email: userEmail,
      client_reference_id: userId, // This will help us identify the user in webhooks
      metadata: {
        userId: userId,
        userEmail: userEmail,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          userEmail: userEmail,
        },
      },
      allow_promotion_codes: true, // Allow discount codes
      billing_address_collection: 'required',
      automatic_tax: {
        enabled: true, // Enable automatic tax calculation
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}