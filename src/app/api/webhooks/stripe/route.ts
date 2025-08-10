// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('No userId found in checkout session');
    return;
  }

  try {
    // Update user document with Stripe customer ID
    await adminDb
      .collection('users')
      .doc(userId)
      .update({
        stripeCustomerId: customerId,
        subscription_status: 'active',
        updatedAt: adminDb.serverTimestamp(),
      });

    console.log(`Updated user ${userId} with Stripe customer ${customerId}`);
  } catch (error) {
    console.error('Error updating user after checkout:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId found in subscription metadata');
    return;
  }

  try {
    await adminDb
      .collection('users')
      .doc(userId)
      .update({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscription_status: 'active',
        subscription_plan: subscription.items.data[0]?.price?.id || 'unknown',
        subscription_current_period_start: new Date(subscription.current_period_start * 1000),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000),
        updatedAt: adminDb.serverTimestamp(),
      });

    console.log(`Created subscription for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const userId = subscription.metadata?.userId;
  const status = getSubscriptionStatus(subscription.status);

  if (!userId) {
    console.error('No userId found in subscription metadata');
    return;
  }

  try {
    await adminDb
      .collection('users')
      .doc(userId)
      .update({
        subscription_status: status,
        subscription_plan: subscription.items.data[0]?.price?.id || 'unknown',
        subscription_current_period_start: new Date(subscription.current_period_start * 1000),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000),
        updatedAt: adminDb.serverTimestamp(),
      });

    console.log(`Updated subscription for user ${userId} to status ${status}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId found in subscription metadata');
    return;
  }

  try {
    await adminDb
      .collection('users')
      .doc(userId)
      .update({
        subscription_status: 'canceled',
        subscription_plan: null,
        subscription_current_period_start: null,
        subscription_current_period_end: null,
        updatedAt: adminDb.serverTimestamp(),
      });

    console.log(`Canceled subscription for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.error('No userId found in subscription metadata');
      return;
    }

    // Ensure subscription is marked as active
    await adminDb
      .collection('users')
      .doc(userId)
      .update({
        subscription_status: 'active',
        subscription_current_period_start: new Date(subscription.current_period_start * 1000),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000),
        updatedAt: adminDb.serverTimestamp(),
      });

    console.log(`Payment succeeded for user ${userId}`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.error('No userId found in subscription metadata');
      return;
    }

    // Mark subscription as past_due or canceled based on Stripe status
    const status = getSubscriptionStatus(subscription.status);

    await adminDb
      .collection('users')
      .doc(userId)
      .update({
        subscription_status: status,
        updatedAt: adminDb.serverTimestamp(),
      });

    console.log(`Payment failed for user ${userId}, status: ${status}`);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

function getSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'trialing':
      return 'trialing';
    case 'incomplete':
    case 'unpaid':
      return 'incomplete';
    default:
      return 'inactive';
  }
}