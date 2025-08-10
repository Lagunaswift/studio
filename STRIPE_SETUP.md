# Stripe + Firebase Subscription System Setup

This document outlines how to set up the comprehensive Stripe + Firebase subscription system that has been integrated into your meal planning app.

## 🎯 Overview

The subscription system includes:
- Stripe checkout integration with monthly/yearly plans
- Firebase webhook handling for subscription lifecycle
- Enhanced subscription verification and limit checking
- Upgrade CTAs throughout the app
- Customer portal for subscription management

## 📋 Prerequisites

1. **Stripe Account**: Create a Stripe account at https://stripe.com
2. **Firebase Project**: Ensure your Firebase project is set up with Firestore
3. **Environment Variables**: Configure the required environment variables

## 🔧 Setup Instructions

### 1. Stripe Configuration

1. **Create Products & Prices in Stripe Dashboard:**
   ```
   Product: Premium Monthly
   Price ID: price_premium_monthly (copy this ID)
   
   Product: Premium Yearly  
   Price ID: price_premium_yearly (copy this ID)
   ```

2. **Configure Webhooks:**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook secret

3. **Update Environment Variables:**
   ```bash
   # Copy .env.example to .env.local
   cp .env.example .env.local
   
   # Fill in your actual Stripe keys
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
   NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
   ```

### 2. Firebase Setup

1. **Update Firestore Rules** (if needed):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

2. **Firebase Admin SDK**:
   - Ensure Firebase Admin environment variables are configured
   - The webhook handlers use Firebase Admin to update user documents

### 3. Test the Integration

1. **Start Development Server:**
   ```bash
   npm run dev
   ```

2. **Test Subscription Flow:**
   - Navigate to `/upgrade`
   - Click "Upgrade to Premium"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Verify webhook receives events in Stripe Dashboard
   - Check Firebase user document is updated with subscription status

3. **Test Limits:**
   - Use free tier until limits are hit
   - Verify upgrade CTAs appear
   - Test that premium users have unlimited access

## 🔄 Usage Flow

### For Free Users:
1. User hits limit (e.g., 3 daily AI generations)
2. `checkSubscriptionLimit()` returns `allowed: false`
3. App shows upgrade CTA or limit modal
4. User clicks upgrade → redirects to `/upgrade`
5. User completes Stripe checkout
6. Webhook updates Firebase user document
7. User now has premium access

### For Premium Users:
1. `checkSubscriptionLimit()` returns `allowed: true`
2. App allows unlimited usage
3. User can manage subscription via customer portal

## 🏗️ Architecture

### Files Created/Modified:

**Core Stripe Integration:**
- `src/lib/stripe.ts` - Stripe client configuration
- `src/app/api/create-checkout-session/route.ts` - Checkout API
- `src/app/api/create-customer-portal-session/route.ts` - Customer portal API
- `src/app/api/webhooks/stripe/route.ts` - Webhook handler

**UI Components:**
- `src/components/subscription/CheckoutButton.tsx` - Reusable checkout buttons
- `src/components/subscription/UpgradePage.tsx` - Premium upgrade page
- `src/components/subscription/LimitReachedModal.tsx` - Updated with Stripe CTAs

**Pages:**
- `src/app/(main)/upgrade/page.tsx` - Upgrade page route
- `src/app/(main)/upgrade/success/page.tsx` - Success page

**Enhanced Logic:**
- `src/lib/subscriptionVerification.ts` - Enhanced subscription checking
- Updated `src/app/(main)/ai-suggestions/page.tsx` - Integrated with new system

**Firebase Functions (Alternative):**
- `functions/src/stripe-webhooks.ts` - Firebase Functions webhook handler

## 🛠️ Customization

### Adding New Subscription Tiers:

1. **Update `subscriptionLimits.ts`:**
   ```typescript
   export type SubscriptionTier = 'free' | 'premium' | 'enterprise';
   ```

2. **Add Stripe Price IDs:**
   ```typescript
   export const STRIPE_PRICE_IDS = {
     premium_monthly: 'price_...',
     premium_yearly: 'price_...',
     enterprise_monthly: 'price_...',
   };
   ```

3. **Update Components:**
   - Add new plan to `UpgradePage.tsx`
   - Update limit checking logic

### Modifying Limits:

Update the `SUBSCRIPTION_LIMITS` object in `src/config/subscriptionLimits.ts`:

```typescript
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    aiRequestsPerDay: 5, // Change daily limit
    aiRequestsPerMonth: 50, // Change monthly limit
    maxRecipes: 10, // Change recipe limit
    // ...
  },
  // ...
};
```

## 🔍 Monitoring

### Stripe Dashboard:
- Monitor payments and subscriptions
- View webhook delivery status
- Check for failed payments

### Firebase Console:
- Monitor user document updates
- Check for subscription status changes
- View usage tracking data

### Application Logs:
- Webhook processing logs
- Subscription verification logs
- Usage tracking logs

## 🚨 Troubleshooting

### Webhook Not Receiving Events:
1. Check webhook endpoint is accessible
2. Verify webhook secret matches
3. Check Stripe Dashboard for delivery attempts
4. Ensure HTTPS in production

### Subscription Status Not Updating:
1. Check Firebase Admin SDK permissions
2. Verify webhook events are being processed
3. Check user document structure matches expectations
4. Verify metadata is being passed correctly

### Checkout Issues:
1. Check Stripe publishable key is correct
2. Verify price IDs match Stripe Dashboard
3. Ensure success/cancel URLs are valid
4. Check for JavaScript errors in browser

## 📈 Production Deployment

1. **Environment Variables:**
   - Use production Stripe keys
   - Set `NEXT_PUBLIC_APP_URL` to production domain
   - Configure production Firebase credentials

2. **Webhook Endpoint:**
   - Update Stripe webhook endpoint to production URL
   - Ensure SSL certificate is valid

3. **Testing:**
   - Test full subscription flow in production
   - Verify webhook delivery
   - Test subscription management

## 🎉 Features Included

✅ **Subscription Management:**
- Monthly and yearly billing options
- Automatic tax calculation
- Promotion code support
- Customer portal for self-service

✅ **Usage Tracking:**
- Daily and monthly limits
- Real-time usage tracking
- Automatic limit enforcement

✅ **User Experience:**
- Seamless upgrade flow
- Clear pricing display
- Usage indicators
- Upgrade CTAs when limits reached

✅ **Business Logic:**
- Webhook-driven updates
- Subscription lifecycle handling
- Failed payment management
- Cancellation handling

The system is now ready for production use! 🚀