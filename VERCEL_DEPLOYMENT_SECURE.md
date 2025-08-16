# 🚀 Secure Vercel Deployment Guide

## IMMEDIATE SETUP REQUIRED

### 1. **Vercel Environment Variables**
Go to your Vercel project settings → Environment Variables and add:

#### **Production Environment:**
```bash
# Firebase Client (Safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com  
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (KEEP SECRET)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_ACTUAL_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----"
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_CLIENT_ID=your_client_id

# AI Services (KEEP SECRET)
GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_AI_API_KEY=your_actual_google_ai_key

# Security (KEEP SECRET - Generate random 32+ char strings)
JWT_SECRET=your_jwt_secret_32_chars_minimum
RATE_LIMIT_SECRET=your_rate_limit_secret_32_chars

# Payment (KEEP SECRET)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
WIX_WEBHOOK_SECRET=your_wix_webhook_secret

# Monitoring (KEEP SECRET)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### 2. **GitHub Secrets Setup**
Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```bash
VERCEL_TOKEN=your_vercel_deploy_token
VERCEL_ORG_ID=your_vercel_team_id  
VERCEL_PROJECT_ID=your_vercel_project_id
```

Get these from:
- **VERCEL_TOKEN**: Vercel Dashboard → Settings → Tokens
- **VERCEL_ORG_ID & PROJECT_ID**: Vercel project settings or `.vercel/project.json`

### 3. **Deployment Commands**

#### **Option A: Automatic Deployment (Recommended)**
```bash
# Push to master branch - automatically deploys to production
git add .
git commit -m "Deploy secure production version"
git push origin master
```

#### **Option B: Manual Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Test deployment
curl https://your-domain.vercel.app/api/health
```

## 🔍 **Post-Deployment Verification**

### Security Tests (CRITICAL)
```bash
# 1. Test authentication protection
curl https://your-domain.vercel.app/api/ai/suggest-recipes
# Should return 401 Unauthorized

# 2. Test health endpoint
curl https://your-domain.vercel.app/api/health  
# Should return {"status":"healthy"}

# 3. Test rate limiting (run multiple times quickly)
for i in {1..10}; do
  curl https://your-domain.vercel.app/api/ai/suggest-recipes
done
# Should eventually return 429 Too Many Requests
```

### Performance Tests
```bash
# Test Core Web Vitals
npx lighthouse https://your-domain.vercel.app --view

# Test PWA functionality  
npx lighthouse https://your-domain.vercel.app --preset=pwa --view
```

## 📊 **Production Monitoring**

### Endpoints
- **Health**: `https://your-domain.vercel.app/api/health`
- **Metrics**: `https://your-domain.vercel.app/api/metrics`
- **Rate Limit Headers**: Check `X-RateLimit-*` headers on API responses

### Vercel Analytics
Enable in Vercel dashboard:
- **Web Analytics**: Track Core Web Vitals automatically
- **Speed Insights**: Monitor real user performance
- **Function Logs**: Monitor API performance and errors

## 🚨 **Security Monitoring**

Your app now includes:
- ✅ **Authentication** on all AI endpoints
- ✅ **Rate limiting** (5-25 requests/minute)  
- ✅ **Security headers** (CSP, HSTS, XSS protection)
- ✅ **Cost monitoring** (alerts when >$50/day)
- ✅ **Error tracking** via Sentry
- ✅ **Automated security scans** in CI/CD

## 🎯 **Your App Is Production-Ready!**

All security vulnerabilities have been resolved:
- ❌ **No more secret exposure**
- ❌ **No more unprotected APIs**  
- ❌ **No more unlimited rate limits**
- ✅ **Enterprise-grade security**
- ✅ **Production monitoring**
- ✅ **Automated deployment pipeline**

**Deploy with confidence! 🚀**