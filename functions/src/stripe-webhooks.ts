// functions/src/stripe-webhooks.ts
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { admin } from './admin';

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2024-06-20',
});

const webhookSecret = functions.config().stripe.webhook_secret;

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature');
    res.status(400).send('Missing signature');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log('Received webhook event:', event.type);

  try {
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

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Webhook handler failed');
  }
});

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('No userId found in checkout session');
    return;
  }

  try {
    // Update user document with Stripe customer ID and active subscription
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        stripeCustomerId: customerId,
        subscription_status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Updated user ${userId} with Stripe customer ${customerId}`);
  } catch (error) {
    console.error('Error updating user after checkout:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  if (!userId) {
    // Try to find user by Stripe customer ID if userId not in metadata
    const userQuery = await admin.firestore()
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.error('No user found for subscription creation');
      return;
    }

    const userDoc = userQuery.docs[0];
    await updateUserSubscription(userDoc.id, subscription);
  } else {
    await updateUserSubscription(userId, subscription);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const userId = subscription.metadata?.userId;
  const customerId = subscription.customer as string;

  if (!userId) {
    // Try to find user by Stripe customer ID
    const userQuery = await admin.firestore()
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.error('No user found for subscription update');
      return;
    }

    const userDoc = userQuery.docs[0];
    await updateUserSubscription(userDoc.id, subscription);
  } else {
    await updateUserSubscription(userId, subscription);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const userId = subscription.metadata?.userId;
  const customerId = subscription.customer as string;

  let targetUserId = userId;

  if (!targetUserId) {
    // Try to find user by Stripe customer ID
    const userQuery = await admin.firestore()
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.error('No user found for subscription deletion');
      return;
    }

    targetUserId = userQuery.docs[0].id;
  }

  try {
    await admin.firestore()
      .collection('users')
      .doc(targetUserId)
      .update({
        subscription_status: 'canceled',
        subscription_plan: null,
        subscription_current_period_start: null,
        subscription_current_period_end: null,
        stripeSubscriptionId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Canceled subscription for user ${targetUserId}`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    
    // Find user by customer ID or subscription metadata
    let userId = subscription.metadata?.userId;
    
    if (!userId) {
      const userQuery = await admin.firestore()
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

      if (userQuery.empty) {
        console.error('No user found for payment success');
        return;
      }

      userId = userQuery.docs[0].id;
    }

    // Ensure subscription is marked as active
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        subscription_status: 'active',
        subscription_current_period_start: new Date(subscription.current_period_start * 1000),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Payment succeeded for user ${userId}`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    
    // Find user by customer ID or subscription metadata
    let userId = subscription.metadata?.userId;
    
    if (!userId) {
      const userQuery = await admin.firestore()
        .collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

      if (userQuery.empty) {
        console.error('No user found for payment failure');
        return;
      }

      userId = userQuery.docs[0].id;
    }

    // Mark subscription as past_due or canceled based on Stripe status
    const status = getSubscriptionStatus(subscription.status);

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        subscription_status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Payment failed for user ${userId}, status: ${status}`);
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
  const status = getSubscriptionStatus(subscription.status);
  
  try {
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        subscription_status: status,
        subscription_plan: subscription.items.data[0]?.price?.id || 'unknown',
        subscription_current_period_start: new Date(subscription.current_period_start * 1000),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Updated subscription for user ${userId} to status ${status}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
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

// Additional function to sync user data with Stripe customer
export const syncStripeCustomer = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.stripeCustomerId) {
    throw new functions.https.HttpsError('not-found', 'No Stripe customer found');
  }

  try {
    // Get current subscription from Stripe
    const customer = await stripe.customers.retrieve(userData.stripeCustomerId, {
      expand: ['subscriptions'],
    }) as Stripe.Customer;

    const subscriptions = customer.subscriptions?.data || [];
    const activeSubscription = subscriptions.find(sub => sub.status === 'active' || sub.status === 'trialing');

    if (activeSubscription) {
      await updateUserSubscription(userId, activeSubscription);
      return { status: 'synced', subscription: true };
    } else {
      // No active subscription
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .update({
          subscription_status: 'canceled',
          subscription_plan: null,
          subscription_current_period_start: null,
          subscription_current_period_end: null,
          stripeSubscriptionId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
      return { status: 'synced', subscription: false };
    }
  } catch (error) {
    console.error('Error syncing Stripe customer:', error);
    throw new functions.https.HttpsError('internal', 'Failed to sync customer data');
  }
});