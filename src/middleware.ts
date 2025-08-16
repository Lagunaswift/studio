import { NextRequest, NextResponse } from 'next/server';
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

  // Request body size limits for DoS protection
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    const contentLength = request.headers.get('content-length');
    const maxSizes = {
      '/api/ai/': 1024 * 1024, // 1MB for AI endpoints
      '/api/webhooks/': 10 * 1024 * 1024, // 10MB for webhooks
      default: 100 * 1024 // 100KB for other endpoints
    };
    
    let maxSize = maxSizes.default;
    for (const [route, size] of Object.entries(maxSizes)) {
      if (route !== 'default' && pathname.startsWith(route)) {
        maxSize = size;
        break;
      }
    }
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { error: 'Request body too large', maxSize: `${maxSize} bytes` },
        { status: 413 }
      );
    }
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

  // Protected API routes requiring authentication - handled at route level
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

    // Token verification will be handled in individual API routes
    // since Firebase Admin SDK requires Node.js runtime
    const token = authHeader.substring(7);
    
    // Add token to headers for route-level verification
    response.headers.set('x-auth-token', token);
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