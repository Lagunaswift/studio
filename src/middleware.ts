import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all requests
  const response = NextResponse.next();
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://api.stripe.com wss:; " +
    "frame-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  
  // Additional security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), location=()');
  
  // HTTPS redirect in production
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-forwarded-proto')?.includes('https')) {
    return NextResponse.redirect(`https://${request.headers.get('host')}${pathname}`, 301);
  }

  // Apply rate limiting based on route type
  let rateLimitResult;
  if (pathname.startsWith('/api/ai/')) {
    rateLimitResult = await applyRateLimit(request, 'aiStrict');
  } else if (pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/wix-webhooks')) {
    rateLimitResult = await applyRateLimit(request, 'webhook');
  } else if (pathname.startsWith('/api/')) {
    rateLimitResult = await applyRateLimit(request, 'general');
  }

  if (rateLimitResult && !rateLimitResult.success) {
    const rateLimitResponse = NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      { status: 429 }
    );
    addRateLimitHeaders(rateLimitResponse, rateLimitResult);
    return rateLimitResponse;
  }

  // Add rate limit headers to successful responses
  if (rateLimitResult) {
    addRateLimitHeaders(response, rateLimitResult);
  }

  // Protected API routes requiring authentication
  const protectedAPIRoutes = [
    '/api/ai/',
    '/api/profile/',
    '/api/genkit'
  ];

  const isProtectedAPI = protectedAPIRoutes.some(route => pathname.startsWith(route));
  
  if (isProtectedAPI) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      const decodedToken = await verifyIdToken(token);
      
      // Add user context to request headers for downstream use
      response.headers.set('x-user-id', decodedToken.uid);
      response.headers.set('x-user-email', decodedToken.email || '');
      
      return response;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
  }

  // Public webhooks (have their own authentication)
  const publicWebhooks = ['/api/webhooks/', '/api/wix-webhooks'];
  if (publicWebhooks.some(route => pathname.startsWith(route))) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)',
  ],
};