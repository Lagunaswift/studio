import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Test Firebase Admin environment variables
    const testResult = {
      timestamp: new Date().toISOString(),
      platform: 'Vercel', // Since you mentioned it's on Vercel
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!privateKey,
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyLength: privateKey?.length,
        privateKeyHasBegin: privateKey?.includes('-----BEGIN PRIVATE KEY-----'),
        privateKeyHasEnd: privateKey?.includes('-----END PRIVATE KEY-----'),
        privateKeyHasNewlines: privateKey?.includes('\n'),
        privateKeyHasLiteralNewlines: privateKey?.includes('\\n'),
        privateKeyStart: privateKey?.substring(0, 50),
        privateKeyEnd: privateKey?.slice(-50),
        // Test different formatting scenarios
        formatting: {
          original: privateKey?.substring(0, 100),
          afterReplace: privateKey?.replace(/\\n/g, '\n').substring(0, 100),
          afterTrim: privateKey?.replace(/\\n/g, '\n').trim().substring(0, 100),
          withoutQuotes: privateKey?.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').substring(0, 100),
        }
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