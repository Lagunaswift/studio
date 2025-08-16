import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isAdminIPAllowed } from '@/lib/admin-security';

export async function GET(request: NextRequest) {
  // Admin IP restriction for security
  if (!isAdminIPAllowed(request)) {
    return NextResponse.json(
      { error: 'Access denied - Admin IP restriction' },
      { status: 403 }
    );
  }
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: 'unknown',
      ai: 'unknown',
      environment: 'unknown'
    },
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  };

  try {
    // Test database connection
    await adminDb.collection('_health').doc('check').get();
    checks.checks.database = 'healthy';
  } catch (error) {
    checks.checks.database = 'unhealthy';
    checks.status = 'degraded';
  }

  // Test AI service availability
  try {
    const hasAIKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
    checks.checks.ai = hasAIKey ? 'healthy' : 'disabled';
  } catch (error) {
    checks.checks.ai = 'unhealthy';
    checks.status = 'degraded';
  }

  // Test environment configuration
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  checks.checks.environment = missingEnvVars.length === 0 ? 'healthy' : 'unhealthy';
  
  if (missingEnvVars.length > 0) {
    checks.status = 'unhealthy';
    (checks as any).missingEnvironmentVariables = missingEnvVars;
  }

  const statusCode = checks.status === 'healthy' ? 200 : 
                     checks.status === 'degraded' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}