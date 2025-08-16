import { adminDb } from '@/lib/firebase-admin';
import { tokenBlacklist } from '@/lib/token-blacklist';

interface UserBehaviorEvent {
  userId: string;
  action: string;
  endpoint: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AnomalyScore {
  score: number; // 0-100, higher = more suspicious
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actions: string[];
}

class AnomalyDetectionService {
  private readonly COLLECTION_NAME = '_security/behavior/events';
  private readonly SUSPICIOUS_THRESHOLD = 70;
  private readonly CRITICAL_THRESHOLD = 90;

  // Track user behavior for anomaly detection
  async trackBehavior(event: UserBehaviorEvent): Promise<AnomalyScore> {
    try {
      // Store behavior event
      await adminDb.collection(this.COLLECTION_NAME).add({
        ...event,
        timestamp: event.timestamp.toISOString(),
        hour: event.timestamp.getHours(),
        dayOfWeek: event.timestamp.getDay()
      });

      // Analyze for anomalies
      const anomalyScore = await this.analyzeUserBehavior(event);
      
      // Take action if suspicious
      if (anomalyScore.score >= this.SUSPICIOUS_THRESHOLD) {
        await this.handleSuspiciousActivity(event, anomalyScore);
      }

      return anomalyScore;
    } catch (error) {
      console.error('Failed to track behavior:', error);
      return { score: 0, reasons: [], riskLevel: 'low', actions: [] };
    }
  }

  private async analyzeUserBehavior(event: UserBehaviorEvent): Promise<AnomalyScore> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    try {
      // Get recent user activity
      const recentActivity = await adminDb
        .collection(this.COLLECTION_NAME)
        .where('userId', '==', event.userId)
        .where('timestamp', '>=', oneHourAgo.toISOString())
        .get();

      const dailyActivity = await adminDb
        .collection(this.COLLECTION_NAME)
        .where('userId', '==', event.userId)
        .where('timestamp', '>=', oneDayAgo.toISOString())
        .get();

      // 1. Rapid Request Pattern Detection
      const requestsLastHour = recentActivity.size;
      if (requestsLastHour > 100) {
        score += 40;
        reasons.push(`Excessive requests: ${requestsLastHour}/hour`);
        actions.push('rate_limit_strict');
      } else if (requestsLastHour > 50) {
        score += 20;
        reasons.push(`High request volume: ${requestsLastHour}/hour`);
      }

      // 2. Geographic Anomaly Detection
      const uniqueIPs = new Set(recentActivity.docs.map(doc => doc.data().ip));
      if (uniqueIPs.size > 5) {
        score += 30;
        reasons.push(`Multiple IPs: ${uniqueIPs.size} different locations`);
        actions.push('require_additional_auth');
      }

      // 3. Time-based Anomaly Detection
      const currentHour = now.getHours();
      const userHistory = dailyActivity.docs.map(doc => doc.data());
      const typicalHours = this.getUserTypicalActiveHours(userHistory);
      
      if (!typicalHours.includes(currentHour) && userHistory.length > 10) {
        score += 15;
        reasons.push(`Unusual time: ${currentHour}:00 (typical: ${typicalHours.join(', ')})`);
      }

      // 4. API Endpoint Pattern Analysis
      const endpointCounts = recentActivity.docs.reduce((acc, doc) => {
        const endpoint = doc.data().endpoint;
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Check for AI endpoint abuse
      const aiRequests = endpointCounts['/api/ai/suggest-meal-plan'] || 0;
      if (aiRequests > 20) {
        score += 35;
        reasons.push(`AI endpoint abuse: ${aiRequests} requests/hour`);
        actions.push('limit_ai_access');
      }

      // 5. User Agent Consistency Check
      const userAgents = new Set(recentActivity.docs.map(doc => doc.data().userAgent));
      if (userAgents.size > 3) {
        score += 25;
        reasons.push(`Multiple user agents: ${userAgents.size} different browsers`);
        actions.push('verify_device');
      }

      // 6. Data Access Pattern Analysis
      const dataEndpoints = ['/api/profile/', '/api/recipes/', '/api/meal-plans/'];
      const dataRequests = Object.entries(endpointCounts)
        .filter(([endpoint]) => dataEndpoints.some(de => endpoint.includes(de)))
        .reduce((sum, [, count]) => sum + count, 0);

      if (dataRequests > 200) {
        score += 50;
        reasons.push(`Excessive data access: ${dataRequests} requests`);
        actions.push('block_user');
      }

      // 7. Failed Authentication Attempts
      const authErrors = userHistory.filter(h => 
        h.endpoint.includes('/api/') && h.metadata?.status >= 401
      ).length;

      if (authErrors > 10) {
        score += 30;
        reasons.push(`Multiple auth failures: ${authErrors} failed attempts`);
        actions.push('account_security_review');
      }

    } catch (error) {
      console.error('Anomaly analysis failed:', error);
      // Default to safe score if analysis fails
      score = 10;
      reasons.push('Analysis error - using default score');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= this.CRITICAL_THRESHOLD) {
      riskLevel = 'critical';
      actions.push('immediate_token_revocation');
    } else if (score >= this.SUSPICIOUS_THRESHOLD) {
      riskLevel = 'high';
      actions.push('enhanced_monitoring');
    } else if (score >= 40) {
      riskLevel = 'medium';
      actions.push('increased_verification');
    } else {
      riskLevel = 'low';
    }

    return { score, reasons, riskLevel, actions };
  }

  private getUserTypicalActiveHours(userHistory: any[]): number[] {
    const hourCounts = userHistory.reduce((acc, event) => {
      const hour = new Date(event.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Return hours with significant activity (>10% of total)
    const totalEvents = userHistory.length;
    const threshold = Math.max(2, totalEvents * 0.1);
    
    return Object.entries(hourCounts)
      .filter(([, count]) => count >= threshold)
      .map(([hour]) => parseInt(hour));
  }

  private async handleSuspiciousActivity(
    event: UserBehaviorEvent, 
    anomalyScore: AnomalyScore
  ): Promise<void> {
    try {
      // Log security alert
      await adminDb.collection('_security/alerts/suspicious').add({
        userId: event.userId,
        anomalyScore,
        event: {
          action: event.action,
          endpoint: event.endpoint,
          ip: event.ip,
          userAgent: event.userAgent.substring(0, 100) // Truncate for storage
        },
        timestamp: new Date(),
        status: 'active'
      });

      // Execute automatic security actions
      for (const action of anomalyScore.actions) {
        await this.executeSecurityAction(action, event, anomalyScore);
      }

      console.warn(`🚨 Suspicious activity detected for user ${event.userId}:`, {
        score: anomalyScore.score,
        riskLevel: anomalyScore.riskLevel,
        reasons: anomalyScore.reasons,
        actions: anomalyScore.actions
      });

    } catch (error) {
      console.error('Failed to handle suspicious activity:', error);
    }
  }

  private async executeSecurityAction(
    action: string, 
    event: UserBehaviorEvent, 
    anomalyScore: AnomalyScore
  ): Promise<void> {
    switch (action) {
      case 'immediate_token_revocation':
        // Get current token and revoke it
        const authHeader = event.metadata?.authHeader;
        if (authHeader) {
          await tokenBlacklist.blacklistToken(
            authHeader.replace('Bearer ', ''),
            event.userId,
            `Anomaly detection: Score ${anomalyScore.score}`,
            'anomaly_system'
          );
        }
        break;

      case 'block_user':
        await tokenBlacklist.blacklistAllUserTokens(
          event.userId,
          `Critical anomaly: ${anomalyScore.reasons.join(', ')}`
        );
        break;

      case 'enhanced_monitoring':
        // Flag user for additional monitoring
        await adminDb.collection('_security/monitoring/enhanced').doc(event.userId).set({
          enabled: true,
          reason: anomalyScore.reasons.join(', '),
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        break;

      case 'rate_limit_strict':
        // Apply stricter rate limits
        await adminDb.collection('_security/rate_limits/strict').doc(event.userId).set({
          limit: 10, // Reduce to 10 requests per hour
          window: 3600,
          appliedAt: new Date(),
          reason: 'Anomaly detection'
        });
        break;

      default:
        console.log(`Security action not implemented: ${action}`);
    }
  }

  // Get user risk assessment
  async getUserRiskAssessment(userId: string): Promise<{
    currentRiskLevel: string;
    recentAnomalies: number;
    isEnhancedMonitoring: boolean;
    recommendations: string[];
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentAlerts = await adminDb
        .collection('_security/alerts/suspicious')
        .where('userId', '==', userId)
        .where('timestamp', '>=', oneDayAgo)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      const enhancedMonitoring = await adminDb
        .collection('_security/monitoring/enhanced')
        .doc(userId)
        .get();

      const isMonitored = enhancedMonitoring.exists && 
        enhancedMonitoring.data()?.expiresAt?.toDate() > new Date();

      const highRiskAlerts = recentAlerts.docs.filter(doc => 
        doc.data().anomalyScore?.riskLevel === 'high' || 
        doc.data().anomalyScore?.riskLevel === 'critical'
      );

      let currentRiskLevel = 'low';
      if (highRiskAlerts.length > 0) {
        currentRiskLevel = highRiskAlerts[0].data().anomalyScore?.riskLevel || 'medium';
      }

      const recommendations = [];
      if (recentAlerts.size > 3) {
        recommendations.push('Review recent account activity');
      }
      if (isMonitored) {
        recommendations.push('Account under enhanced security monitoring');
      }
      if (highRiskAlerts.length > 0) {
        recommendations.push('Consider changing password and reviewing devices');
      }

      return {
        currentRiskLevel,
        recentAnomalies: recentAlerts.size,
        isEnhancedMonitoring: isMonitored,
        recommendations
      };
    } catch (error) {
      console.error('Failed to get risk assessment:', error);
      return {
        currentRiskLevel: 'low',
        recentAnomalies: 0,
        isEnhancedMonitoring: false,
        recommendations: []
      };
    }
  }
}

export const anomalyDetection = new AnomalyDetectionService();

// Middleware helper to track behavior
export async function trackUserBehavior(
  request: Request,
  userId: string,
  action: string,
  endpoint: string
): Promise<AnomalyScore> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const behaviorEvent: UserBehaviorEvent = {
    userId,
    action,
    endpoint,
    ip,
    userAgent,
    timestamp: new Date(),
    metadata: {
      method: request.method,
      authHeader: request.headers.get('authorization')
    }
  };

  return await anomalyDetection.trackBehavior(behaviorEvent);
}