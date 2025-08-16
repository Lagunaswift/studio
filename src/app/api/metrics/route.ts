import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Basic metrics for monitoring
    const metrics = {
      timestamp: new Date().toISOString(),
      nodejs: {
        version: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      api: {
        rateLimitHits: await getRateLimitMetrics(),
        activeConnections: getActiveConnections()
      },
      database: {
        status: await getDatabaseStatus()
      }
    };

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

async function getRateLimitMetrics() {
  // In production, this would connect to Redis/external store
  // For now, return placeholder
  return {
    total: 0,
    ai_endpoints: 0,
    general_endpoints: 0
  };
}

function getActiveConnections() {
  // Monitor active connections if needed
  return process.listenerCount('connection') || 0;
}

async function getDatabaseStatus() {
  try {
    const start = Date.now();
    await adminDb.collection('_health').doc('ping').get();
    const responseTime = Date.now() - start;
    
    return {
      status: 'connected',
      responseTimeMs: responseTime
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: 'Database connection failed'
    };
  }
}