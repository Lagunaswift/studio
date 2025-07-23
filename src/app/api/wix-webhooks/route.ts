
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// --- Initialize Firebase Admin SDK ---
// This ensures the SDK is initialized only once.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // For local development or environments where GOOGLE_APPLICATION_CREDENTIALS is set
    console.log("Initializing Firebase Admin with default credentials...");
    admin.initializeApp();
  }
}

const db = admin.firestore();

// --- Zod Schema for Payload Validation ---
const WixWebhookPayloadSchema = z.object({
  secretKey: z.string().min(1, { message: 'secretKey is required.' }),
  userEmail: z.string().email({ message: 'A valid userEmail is required.' }),
  eventType: z.enum(['plan.started', 'plan.canceled', 'plan.expired', 'plan.test']), // Add any other events from Wix
  planName: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(), // Expecting ISO 8601 string
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the Secret Key
    const expectedSecret = process.env.WIX_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error("[CRITICAL] WIX_WEBHOOK_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const payload = await req.json();
    const validation = WixWebhookPayloadSchema.safeParse(payload);

    if (!validation.success) {
      console.warn("[SECURITY] Webhook payload failed validation:", validation.error.flatten());
      return NextResponse.json({ error: 'Bad Request: Invalid payload structure.', details: validation.error.flatten() }, { status: 400 });
    }

    if (validation.data.secretKey !== expectedSecret) {
      console.warn(`[SECURITY] Unauthorized webhook attempt. Received secret: '${validation.data.secretKey}'`);
      return NextResponse.json({ error: 'Unauthorized: Invalid secret key' }, { status: 401 });
    }
    
    console.log('[INFO] Wix webhook secret verified successfully.');

    // 2. Process the Payload
    const { userEmail, eventType, planName, startDate } = validation.data;

    let subscriptionStatus: 'active' | 'inactive' | 'none' = 'none';
    if (eventType === 'plan.started' || eventType === 'plan.test') {
      subscriptionStatus = 'active';
    } else if (eventType === 'plan.canceled' || eventType === 'plan.expired') {
      subscriptionStatus = 'inactive';
    }

    const updateData: { [key: string]: any } = {
      subscription_status: subscriptionStatus,
      plan_name: planName || null,
      subscription_start_date: startDate ? new Date(startDate).toISOString() : null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // 3. Update Firestore
    const profilesRef = db.collection('profiles');
    const userQuerySnapshot = await profilesRef.where('email', '==', userEmail).limit(1).get();

    if (userQuerySnapshot.empty) {
      console.warn(`[INFO] Profile not found for email: ${userEmail}. Cannot update subscription.`);
      // Depending on business logic, you could create a profile stub here.
      // For now, we return a 404.
      return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
    }

    const userDocRef = userQuerySnapshot.docs[0].ref;
    await userDocRef.update(updateData);

    console.log(`[SUCCESS] Subscription for ${userEmail} updated to status: ${subscriptionStatus}`);
    return NextResponse.json({ success: true, message: 'Subscription status updated successfully.' });

  } catch (error: any) {
    console.error("Critical error in Wix webhook handler:", error);
    // Differentiate between JSON parsing errors and other errors
    if (error.name === 'SyntaxError') {
        return NextResponse.json({ error: 'Bad Request: Invalid JSON body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
