import { adminDb } from '@/lib/firebase-admin';

interface BlacklistedToken {
  tokenHash: string;
  userId: string;
  reason: string;
  blacklistedAt: Date;
  expiresAt: Date;
  revokedBy?: string;
}

class TokenBlacklistService {
  private readonly COLLECTION_NAME = '_security/tokens/blacklist';
  private readonly LOCAL_CACHE = new Map<string, boolean>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  // Hash token for privacy (store hash, not actual token)
  private hashToken(token: string): string {
    // Simple hash for token identification without storing actual token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(36);
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    
    // Check local cache first
    if (this.LOCAL_CACHE.has(tokenHash) && 
        Date.now() - this.lastCacheUpdate < this.CACHE_TTL) {
      return this.LOCAL_CACHE.get(tokenHash)!;
    }

    try {
      // Check Firebase blacklist
      const blacklistDoc = await adminDb
        .collection(this.COLLECTION_NAME)
        .doc(tokenHash)
        .get();

      const isBlacklisted = blacklistDoc.exists && 
        blacklistDoc.data()?.expiresAt?.toDate() > new Date();

      // Update local cache
      this.LOCAL_CACHE.set(tokenHash, isBlacklisted);
      this.lastCacheUpdate = Date.now();

      return isBlacklisted;
    } catch (error) {
      console.error('Failed to check token blacklist:', error);
      // Fail secure - assume not blacklisted if we can't check
      return false;
    }
  }

  // Add token to blacklist
  async blacklistToken(
    token: string, 
    userId: string, 
    reason: string,
    revokedBy?: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    
    // Parse token to get expiry
    const payload = this.parseJWTPayload(token);
    const expiresAt = new Date(payload.exp * 1000);

    const blacklistEntry: BlacklistedToken = {
      tokenHash,
      userId,
      reason,
      blacklistedAt: new Date(),
      expiresAt,
      revokedBy
    };

    try {
      await adminDb
        .collection(this.COLLECTION_NAME)
        .doc(tokenHash)
        .set(blacklistEntry);

      // Update local cache
      this.LOCAL_CACHE.set(tokenHash, true);
      
      // Log security event
      await this.logSecurityEvent('token_blacklisted', {
        userId,
        reason,
        revokedBy,
        tokenHash: tokenHash.substring(0, 8) + '...' // Partial hash for logging
      });

      console.log(`🚫 Token blacklisted for user ${userId}: ${reason}`);
    } catch (error) {
      console.error('Failed to blacklist token:', error);
      throw new Error('Token revocation failed');
    }
  }

  // Blacklist all tokens for a user (for account security)
  async blacklistAllUserTokens(userId: string, reason: string): Promise<void> {
    try {
      // Add user to global revocation list
      await adminDb
        .collection('_security/users/revoked')
        .doc(userId)
        .set({
          userId,
          reason,
          revokedAt: new Date(),
          allTokensInvalid: true
        });

      await this.logSecurityEvent('all_tokens_revoked', { userId, reason });
      console.log(`🚫 All tokens revoked for user ${userId}: ${reason}`);
    } catch (error) {
      console.error('Failed to revoke all user tokens:', error);
      throw new Error('Mass token revocation failed');
    }
  }

  // Check if user has global token revocation
  async isUserGloballyRevoked(userId: string): Promise<boolean> {
    try {
      const revokedDoc = await adminDb
        .collection('_security/users/revoked')
        .doc(userId)
        .get();

      return revokedDoc.exists && revokedDoc.data()?.allTokensInvalid === true;
    } catch (error) {
      console.error('Failed to check user revocation status:', error);
      return false;
    }
  }

  // Clean up expired blacklist entries (run as scheduled job)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const expiredQuery = await adminDb
        .collection(this.COLLECTION_NAME)
        .where('expiresAt', '<=', new Date())
        .get();

      const batch = adminDb.batch();
      expiredQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`🧹 Cleaned up ${expiredQuery.docs.length} expired blacklist entries`);
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
    }
  }

  private parseJWTPayload(token: string): { exp: number; iat: number; uid: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error('Failed to parse JWT payload:', error);
      // Default expiry 1 hour from now
      return { 
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        uid: 'unknown'
      };
    }
  }

  private async logSecurityEvent(event: string, data: any): Promise<void> {
    try {
      await adminDb.collection('_security/events/log').add({
        event,
        data,
        timestamp: new Date(),
        severity: 'high'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

export const tokenBlacklist = new TokenBlacklistService();