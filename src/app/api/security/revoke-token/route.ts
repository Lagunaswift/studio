import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, createAuthenticatedResponse } from '@/lib/auth-helpers';
import { tokenBlacklist } from '@/lib/token-blacklist';
import { isAdminIPAllowed } from '@/lib/admin-security';
import { z } from 'zod';

export const runtime = 'nodejs';

const RevokeTokenSchema = z.object({
  action: z.enum(['revoke_current', 'revoke_all_user', 'revoke_specific']),
  targetUserId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
  specificToken: z.string().optional()
});

export async function POST(request: NextRequest) {
  // Admin IP restriction for security
  if (!isAdminIPAllowed(request)) {
    return NextResponse.json(
      { error: 'Access denied - Admin IP restriction' },
      { status: 403 }
    );
  }

  // Authenticate request
  const authResult = await authenticateRequest(request);
  const authError = createAuthenticatedResponse(authResult);
  if (authError) return authError;
  
  const adminUserId = authResult.user?.uid;
  
  try {
    const body = await request.json();
    const validatedInput = RevokeTokenSchema.parse(body);
    
    const currentToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    switch (validatedInput.action) {
      case 'revoke_current':
        if (!currentToken) {
          return NextResponse.json(
            { error: 'No current token to revoke' },
            { status: 400 }
          );
        }
        
        await tokenBlacklist.blacklistToken(
          currentToken,
          adminUserId!,
          validatedInput.reason,
          adminUserId
        );
        
        return NextResponse.json({
          success: true,
          message: 'Current token revoked successfully'
        });

      case 'revoke_all_user':
        if (!validatedInput.targetUserId) {
          return NextResponse.json(
            { error: 'Target user ID required for user revocation' },
            { status: 400 }
          );
        }
        
        await tokenBlacklist.blacklistAllUserTokens(
          validatedInput.targetUserId,
          `Admin revocation by ${adminUserId}: ${validatedInput.reason}`
        );
        
        return NextResponse.json({
          success: true,
          message: `All tokens revoked for user ${validatedInput.targetUserId}`
        });

      case 'revoke_specific':
        if (!validatedInput.specificToken || !validatedInput.targetUserId) {
          return NextResponse.json(
            { error: 'Specific token and target user ID required' },
            { status: 400 }
          );
        }
        
        await tokenBlacklist.blacklistToken(
          validatedInput.specificToken,
          validatedInput.targetUserId,
          validatedInput.reason,
          adminUserId
        );
        
        return NextResponse.json({
          success: true,
          message: 'Specific token revoked successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid revocation action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Token revocation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Token revocation failed' },
      { status: 500 }
    );
  }
}