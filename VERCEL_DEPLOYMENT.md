# Vercel Deployment Guide for MealPlannerPro

This guide walks through deploying the Next.js 15 MealPlannerPro application to Vercel.

## Prerequisites

1. Vercel account (https://vercel.com)
2. Environment variables from your `.env` file
3. Firebase project configured
4. Stripe account configured (if using subscription features)
5. Gemini API key for AI features

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your Git repository
4. Select the correct repository and branch

### 2. Configure Environment Variables

In your Vercel project dashboard, go to Settings > Environment Variables and add:

#### Required Variables
```bash
# AI Features
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_your_monthly_price_id
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID=price_your_yearly_price_id

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### Optional Variables
```bash
# Wix Integration
WIX_WEBHOOK_SECRET=your_wix_webhook_secret

# Firebase Admin (Optional)
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_CLIENT_ID=your_client_id

# Error Monitoring
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### 3. Build Configuration

The project includes optimized function settings:

- **Runtime**: Node.js 18.x (Vercel supported version)
- **AI Functions**: 5 minutes timeout with 1GB memory for Genkit AI operations (`/api/ai/**`, `/api/genkit/**`)
- **Standard Functions**: 60 seconds timeout for regular API routes
- **Memory**: Increased allocation for AI-intensive operations

### 4. Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for build to complete
3. Verify deployment at your assigned URL

## Post-Deployment Setup

### 1. Update Firebase Auth Domain

Add your Vercel domain to Firebase Auth:
1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Add your Vercel domain (e.g., `your-app.vercel.app`)

### 2. Configure Stripe Webhooks

1. Go to Stripe Dashboard > Webhooks
2. Create new webhook endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` environment variable

### 3. Update App URL

Update `NEXT_PUBLIC_APP_URL` to your production domain.

## Troubleshooting

### Function Runtime Errors
- **"Function Runtimes must have a valid version"**: Ensure `vercel.json` uses `nodejs18.x` (not `nodejs20.x`)
- **AI Function Timeouts**: AI routes have 5-minute timeout - check Genkit flow performance
- **Memory Issues**: AI functions allocated 1GB - increase if needed for complex operations

### Build Fails
- Check Node.js memory allocation in build logs
- Verify all required environment variables are set
- Check for TypeScript errors (ignored but may cause issues)
- Ensure Genkit dependencies are properly bundled

### AI Features Not Working
- Verify `GEMINI_API_KEY` is correctly set
- Check API quota and billing in Google AI Studio
- Ensure Genkit server modules are properly excluded from client bundle
- Check function logs in Vercel dashboard for AI route errors

### Firebase Auth Issues
- Verify all Firebase config variables are set
- Check authorized domains in Firebase Console
- Ensure private key is properly formatted with newlines

### Stripe Integration Issues
- Verify webhook endpoint is accessible
- Check webhook secret matches environment variable
- Ensure price IDs are correct for your Stripe products

## Monitoring

- Use Vercel Analytics for performance monitoring
- Configure Sentry for error tracking
- Monitor Firebase usage in Firebase Console
- Track Stripe events in Stripe Dashboard

## Performance Optimization

The app includes several optimizations:
- Static asset caching (1 year)
- Image optimization (1 month cache)
- API route cache control
- Bundle optimization for client/server separation
- Service worker for offline functionality

## Security Notes

- All server-side modules are properly excluded from client bundle
- Private keys and secrets are server-side only
- CORS headers configured for API routes
- Proper cache headers prevent sensitive data caching