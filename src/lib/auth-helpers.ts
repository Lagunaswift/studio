import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import { tokenBlacklist } from '@/lib/token-blacklist';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: { uid: string; email?: string };
  error?: string;
}> {
  try {
    // Get token from middleware-set header or authorization header
    let token = request.headers.get('x-auth-token') || 
                request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided'
      };
    }

    // Check token blacklist first
    const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return {
        success: false,
        error: 'Token has been revoked'
      };
    }

    const decodedToken = await verifyIdToken(token);
    
    // Check if user has global token revocation
    const isUserRevoked = await tokenBlacklist.isUserGloballyRevoked(decodedToken.uid);
    if (isUserRevoked) {
      return {
        success: false,
        error: 'All user tokens have been revoked'
      };
    }
    
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email
      }
    };
  } catch (error: any) {
    console.error('Authentication failed:', error.message);
    return {
      success: false,
      error: 'Invalid or expired token'
    };
  }
}

export function createAuthenticatedResponse(authResult: { success: boolean; error?: string }) {
  if (!authResult.success) {
    return Response.json(
      { 
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      },
      { status: 401 }
    );
  }
  return null;
}