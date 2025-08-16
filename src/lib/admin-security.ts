import { NextRequest } from 'next/server';

// Admin IP whitelist - configure in production
const ADMIN_ALLOWED_IPS = [
  '127.0.0.1',        // localhost
  '::1',              // localhost IPv6
  '10.0.0.0/8',       // Private network
  '172.16.0.0/12',    // Private network
  '192.168.0.0/16',   // Private network
  // Add your production admin IPs here
];

export function isAdminIPAllowed(request: NextRequest): boolean {
  // In development, allow all IPs
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const clientIP = getClientIP(request);
  
  // If we can't determine IP, deny access
  if (!clientIP) {
    console.warn('🚨 Admin endpoint access denied - no IP detected');
    return false;
  }

  const isAllowed = ADMIN_ALLOWED_IPS.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation - basic check
      const [network, prefixLength] = allowedIP.split('/');
      return clientIP.startsWith(network.split('.').slice(0, parseInt(prefixLength) / 8).join('.'));
    }
    return clientIP === allowedIP;
  });

  if (!isAllowed) {
    console.warn(`🚨 Admin endpoint access denied for IP: ${clientIP}`);
  }

  return isAllowed;
}

function getClientIP(request: NextRequest): string | null {
  // Check various headers for client IP
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    request.headers.get('x-client-ip') ||
    request.headers.get('x-cluster-client-ip') ||
    null
  );
}