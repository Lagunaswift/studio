import { NextRequest, NextResponse } from 'next/server';
import { isAdminIPAllowed } from '@/lib/admin-security';
import { anomalyDetection } from '@/lib/anomaly-detection';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Admin IP restriction for security
  if (!isAdminIPAllowed(request)) {
    return NextResponse.json(
      { error: 'Access denied - Admin IP restriction' },
      { status: 403 }
    );
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get security metrics
    const [
      recentAlerts,
      weeklyAlerts,
      enhancedMonitoring,
      blacklistedTokens,
      revokedUsers
    ] = await Promise.all([
      // Recent suspicious activity
      adminDb
        .collection('_security/alerts/suspicious')
        .where('timestamp', '>=', oneDayAgo)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get(),

      // Weekly trend
      adminDb
        .collection('_security/alerts/suspicious')
        .where('timestamp', '>=', oneWeekAgo)
        .get(),

      // Users under enhanced monitoring
      adminDb
        .collection('_security/monitoring/enhanced')
        .where('expiresAt', '>', now)
        .get(),

      // Active blacklisted tokens
      adminDb
        .collection('_security/tokens/blacklist')
        .where('expiresAt', '>', now)
        .get(),

      // Globally revoked users
      adminDb
        .collection('_security/users/revoked')
        .where('allTokensInvalid', '==', true)
        .get()
    ]);

    // Analyze patterns
    const alertsByRiskLevel = recentAlerts.docs.reduce((acc, doc) => {
      const riskLevel = doc.data().anomalyScore?.riskLevel || 'low';
      acc[riskLevel] = (acc[riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAnomalyReasons = recentAlerts.docs
      .flatMap(doc => doc.data().anomalyScore?.reasons || [])
      .reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topSuspiciousIPs = recentAlerts.docs
      .map(doc => doc.data().event?.ip)
      .filter(Boolean)
      .reduce((acc, ip) => {
        acc[ip] = (acc[ip] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const securityDashboard = {
      timestamp: now.toISOString(),
      summary: {
        recentAlerts: recentAlerts.size,
        weeklyAlerts: weeklyAlerts.size,
        usersUnderMonitoring: enhancedMonitoring.size,
        blacklistedTokens: blacklistedTokens.size,
        revokedUsers: revokedUsers.size
      },
      riskAnalysis: {
        alertsByRiskLevel,
        topAnomalyReasons: Object.entries(topSuspiciousIPs)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topSuspiciousIPs: Object.entries(topSuspiciousIPs)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
      },
      recentHighRiskEvents: recentAlerts.docs
        .filter(doc => 
          doc.data().anomalyScore?.riskLevel === 'high' || 
          doc.data().anomalyScore?.riskLevel === 'critical'
        )
        .slice(0, 10)
        .map(doc => ({
          userId: doc.data().userId,
          timestamp: doc.data().timestamp,
          riskLevel: doc.data().anomalyScore?.riskLevel,
          score: doc.data().anomalyScore?.score,
          reasons: doc.data().anomalyScore?.reasons,
          ip: doc.data().event?.ip,
          endpoint: doc.data().event?.endpoint
        })),
      systemHealth: {
        tokenBlacklistSize: blacklistedTokens.size,
        enhancedMonitoringActive: enhancedMonitoring.size > 0,
        weeklyTrend: weeklyAlerts.size > recentAlerts.size * 7 ? 'increasing' : 'stable'
      }
    };

    return NextResponse.json(securityDashboard);

  } catch (error: any) {
    console.error('Security dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to generate security dashboard' },
      { status: 500 }
    );
  }
}