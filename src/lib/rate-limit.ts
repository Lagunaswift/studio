import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  error?: string;
}

class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(request) : this.getDefaultKey(request);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    let entry = this.store.get(key);

    // Reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime };
      this.store.set(key, entry);
    }

    entry.count++;
    this.store.set(key, entry);

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const success = entry.count <= this.config.maxRequests;

    return {
      success,
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      error: success ? undefined : 'Rate limit exceeded'
    };
  }

  private getDefaultKey(request: NextRequest): string {
    // Use IP address or user ID for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                request.headers.get('x-real-ip') || 
                'anonymous';
    
    const userId = request.headers.get('x-user-id');
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
}

// Rate limit configurations for different endpoints
export const rateLimiters = {
  // General API rate limit: 100 requests per minute
  general: new InMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }),

  // AI endpoints: 10 requests per minute per user
  ai: new InMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (request) => {
      const userId = request.headers.get('x-user-id');
      return userId ? `ai:user:${userId}` : `ai:ip:${request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous'}`;
    }
  }),

  // Strict AI endpoints: 5 requests per minute per user
  aiStrict: new InMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyGenerator: (request) => {
      const userId = request.headers.get('x-user-id');
      return userId ? `ai-strict:user:${userId}` : `ai-strict:ip:${request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous'}`;
    }
  }),

  // Webhooks: 1000 requests per minute (for legitimate webhook traffic)
  webhook: new InMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000
  })
};

export async function applyRateLimit(
  request: NextRequest, 
  limiterType: keyof typeof rateLimiters = 'general'
): Promise<RateLimitResult> {
  const limiter = rateLimiters[limiterType];
  return await limiter.checkLimit(request);
}

// Helper function to add rate limit headers to response
export function addRateLimitHeaders(response: Response, result: RateLimitResult) {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
}