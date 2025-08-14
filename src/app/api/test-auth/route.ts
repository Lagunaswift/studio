import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test Firebase Admin environment variables
    const testResult = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50),
        privateKeyEnd: process.env.FIREBASE_PRIVATE_KEY?.substring(-50),
        privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length,
        privateKeyHasBegin: process.env.FIREBASE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----'),
        privateKeyHasEnd: process.env.FIREBASE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----'),
      }
    };

    // Try to import Firebase Admin to test initialization
    try {
      const { adminAuth, adminDb } = await import('@/lib/firebase-admin');
      testResult.firebaseAdmin = {
        authReady: !!adminAuth,
        dbReady: !!adminDb,
        status: 'initialized'
      };
    } catch (adminError: any) {
      testResult.firebaseAdmin = {
        status: 'failed',
        error: adminError.message,
        stack: adminError.stack?.substring(0, 500)
      };
    }

    return NextResponse.json({ 
      success: true, 
      debug: testResult 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack?.substring(0, 500)
    }, { status: 500 });
  }
}