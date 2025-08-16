import { adminDb } from '@/lib/firebase-admin';

interface APIUsageMetrics {
  endpoint: string;
  userId: string | null;
  timestamp: Date;
  responseTime: number;
  status: number;
  costEstimate?: number;
}

interface DailyUsageStats {
  date: string;
  totalRequests: number;
  aiRequests: number;
  uniqueUsers: number;
  totalCostEstimate: number;
  averageResponseTime: number;
}

class APIMonitoringService {
  private readonly COST_PER_AI_REQUEST = 0.01; // Estimate $0.01 per AI request
  private readonly DAILY_COST_ALERT_THRESHOLD = 50; // Alert if daily costs exceed $50
  private readonly HOURLY_REQUEST_ALERT_THRESHOLD = 1000; // Alert if >1000 requests/hour

  async logAPIUsage(metrics: APIUsageMetrics): Promise<void> {
    try {
      const doc = {
        ...metrics,
        timestamp: metrics.timestamp.toISOString(),
        hour: new Date().getHours(),
        minute: new Date().getMinutes()
      };

      await adminDb
        .collection('_monitoring')
        .doc('api_usage')
        .collection('logs')
        .add(doc);

      // Update real-time counters
      await this.updateDailyStats(metrics);
      
      // Check for alerts
      await this.checkAlerts(metrics);
    } catch (error) {
      console.error('Failed to log API usage:', error);
      // Don't throw - monitoring shouldn't break the app
    }
  }

  async getDailyStats(date: string): Promise<DailyUsageStats | null> {
    try {
      const doc = await adminDb
        .collection('_monitoring')
        .doc('daily_stats')
        .collection('dates')
        .doc(date)
        .get();

      return doc.exists ? (doc.data() as DailyUsageStats) : null;
    } catch (error) {
      console.error('Failed to get daily stats:', error);
      return null;
    }
  }

  private async updateDailyStats(metrics: APIUsageMetrics): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const docRef = adminDb
      .collection('_monitoring')
      .doc('daily_stats')
      .collection('dates')
      .doc(today);

    const isAIRequest = metrics.endpoint.includes('/api/ai/');
    const costEstimate = isAIRequest ? this.COST_PER_AI_REQUEST : 0;

    try {
      await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        
        if (doc.exists) {
          const data = doc.data() as DailyUsageStats;
          const uniqueUsers = new Set([
            ...((data as any).userIds || []),
            ...(metrics.userId ? [metrics.userId] : [])
          ]);

          transaction.update(docRef, {
            totalRequests: data.totalRequests + 1,
            aiRequests: data.aiRequests + (isAIRequest ? 1 : 0),
            uniqueUsers: uniqueUsers.size,
            totalCostEstimate: data.totalCostEstimate + costEstimate,
            averageResponseTime: (data.averageResponseTime * data.totalRequests + metrics.responseTime) / (data.totalRequests + 1),
            userIds: Array.from(uniqueUsers),
            lastUpdated: new Date().toISOString()
          });
        } else {
          const newStats: DailyUsageStats & { userIds: string[] } = {
            date: today,
            totalRequests: 1,
            aiRequests: isAIRequest ? 1 : 0,
            uniqueUsers: metrics.userId ? 1 : 0,
            totalCostEstimate: costEstimate,
            averageResponseTime: metrics.responseTime,
            userIds: metrics.userId ? [metrics.userId] : []
          };
          transaction.set(docRef, newStats);
        }
      });
    } catch (error) {
      console.error('Failed to update daily stats:', error);
    }
  }

  private async checkAlerts(metrics: APIUsageMetrics): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();
      
      // Check daily cost threshold
      const dailyStats = await this.getDailyStats(today);
      if (dailyStats && dailyStats.totalCostEstimate > this.DAILY_COST_ALERT_THRESHOLD) {
        await this.sendCostAlert(dailyStats);
      }

      // Check hourly request threshold
      const hourlyCount = await this.getHourlyRequestCount(currentHour);
      if (hourlyCount > this.HOURLY_REQUEST_ALERT_THRESHOLD) {
        await this.sendVolumeAlert(hourlyCount, currentHour);
      }
    } catch (error) {
      console.error('Failed to check alerts:', error);
    }
  }

  private async getHourlyRequestCount(hour: number): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const query = await adminDb
        .collection('_monitoring')
        .doc('api_usage')
        .collection('logs')
        .where('timestamp', '>=', oneHourAgo.toISOString())
        .count()
        .get();

      return query.data().count;
    } catch (error) {
      console.error('Failed to get hourly count:', error);
      return 0;
    }
  }

  private async sendCostAlert(stats: DailyUsageStats): Promise<void> {
    console.error(`🚨 COST ALERT: Daily spending exceeded $${this.DAILY_COST_ALERT_THRESHOLD}`, {
      currentCost: stats.totalCostEstimate,
      requests: stats.totalRequests,
      aiRequests: stats.aiRequests,
      date: stats.date
    });

    // In production, integrate with alerting service (PagerDuty, Slack, etc.)
    await adminDb.collection('_alerts').add({
      type: 'cost_threshold',
      severity: 'high',
      message: `Daily API costs exceeded $${this.DAILY_COST_ALERT_THRESHOLD}`,
      data: stats,
      timestamp: new Date().toISOString()
    });
  }

  private async sendVolumeAlert(count: number, hour: number): Promise<void> {
    console.error(`🚨 VOLUME ALERT: Hourly requests exceeded ${this.HOURLY_REQUEST_ALERT_THRESHOLD}`, {
      count,
      hour,
      threshold: this.HOURLY_REQUEST_ALERT_THRESHOLD
    });

    await adminDb.collection('_alerts').add({
      type: 'request_volume',
      severity: 'medium',
      message: `Hourly request volume exceeded ${this.HOURLY_REQUEST_ALERT_THRESHOLD}`,
      data: { count, hour, threshold: this.HOURLY_REQUEST_ALERT_THRESHOLD },
      timestamp: new Date().toISOString()
    });
  }
}

export const apiMonitoring = new APIMonitoringService();

// Middleware helper to track API usage
export async function trackAPIUsage(
  endpoint: string,
  userId: string | null,
  responseTime: number,
  status: number
): Promise<void> {
  await apiMonitoring.logAPIUsage({
    endpoint,
    userId,
    timestamp: new Date(),
    responseTime,
    status
  });
}