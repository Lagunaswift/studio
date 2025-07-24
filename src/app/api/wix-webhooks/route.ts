// studio-supabasetofirebase/src/app/api/wix-webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// --- Initialize Firebase Admin SDK ---
// This ensures the SDK is initialized only once per function instance.
if (!admin.apps.length) {
  try {
    // For Firebase App Hosting (Cloud Run), the Admin SDK automatically
    // initializes using the default service account credentials provided by GCP.
    // We no longer need to parse FIREBASE_SERVICE_ACCOUNT_KEY here for deployment.
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized with default credentials.");
  } catch (error) {
    // This catch block will trigger if there's a fundamental issue preventing
    // default initialization (e.g., severe permission problems in the environment).
    console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK.", error);
    // Re-throw to indicate a fatal issue that prevents the app/API route from working.
    throw new Error("Firebase Admin SDK initialization failed due to environment configuration.");
  }
}

const db = admin.firestore(); // Firestore instance

// --- Zod Schema for Payload Validation ---
const WixWebhookPayloadSchema = z.object({
  secretKey: z.string().min(1, { message: 'secretKey is required.' }),
  userEmail: z.string().email({ message: 'A valid userEmail is required.' }),
  eventType: z.enum(['plan.started', 'plan.canceled', 'plan.expired', 'plan.test']), // Add any other events from Wix
  planName: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(), // Expecting ISO 8601 string
});

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    // Read the raw request body as text first. This is more resilient to unexpected body formats.
    rawBody = await req.text();
    
    // If the body is empty, it's highly likely a Next.js build-time probe.
    // Return a successful response to allow the build to proceed.
    if (!rawBody) {
      console.warn("Wix webhook handler received an empty request body. (Likely a Next.js build probe).");
      return NextResponse.json({ success: true, message: 'Empty body received.' }, { status: 200 });
    }
  } catch (e) {
    console.error("Failed to read raw request body:", e);
    return NextResponse.json({ error: 'Internal Server Error: Could not read request body.' }, { status: 500 });
  }

  let payload: any;
  try {
    // Attempt to parse the raw text body as JSON.
    // This will throw a SyntaxError if 'rawBody' is not valid JSON.
    payload = JSON.parse(rawBody);
  } catch (e: any) {
    console.error("Failed to parse request body as JSON:", e);
    if (e.name === 'SyntaxError') {
      return NextResponse.json({ error: 'Bad Request: Invalid JSON body provided.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error during JSON parsing.' }, { status: 500 });
  }

  try {
    // 1. Verify the Secret Key
    // Ensure WIX_WEBHOOK_SECRET is set as an environment variable in your Firebase Hosting settings.
    const expectedSecret = process.env.WIX_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error("[CRITICAL] WIX_WEBHOOK_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: 'Internal Server Error: Webhook secret not configured.' }, { status: 500 });
    }

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
      return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
    }

    const userDocRef = userQuerySnapshot.docs[0].ref;
    await userDocRef.update(updateData);

    console.log(`[SUCCESS] Subscription for ${userEmail} updated to status: ${subscriptionStatus}`);
    return NextResponse.json({ success: true, message: 'Subscription status updated successfully.' });

  } catch (error: any) {
    // This catch block handles errors occurring after successful JSON parsing and Zod validation.
    console.error("Critical error in Wix webhook handler (after JSON parsing and validation):", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}