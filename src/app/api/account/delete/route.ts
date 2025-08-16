import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, createAuthenticatedResponse } from '@/lib/auth-helpers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { trackAPIUsage } from '@/lib/api-monitoring';
import Stripe from 'stripe';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmationText: z.string().refine(
    (val) => val === 'DELETE',
    'Must type DELETE to confirm'
  ),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Authenticate request
  const authResult = await authenticateRequest(request);
  const authError = createAuthenticatedResponse(authResult);
  if (authError) return authError;
  
  const userId = authResult.user?.uid;
  
  try {
    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedInput = DeleteAccountSchema.parse(body);
    
    // Get user document from Firebase
    const userDoc = await adminDb.collection('profiles').doc(userId!).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data();
    
    // Step 1: Cancel Stripe subscription if exists
    if (userData?.stripeSubscriptionId) {
      try {
        console.log(`🔄 Canceling Stripe subscription: ${userData.stripeSubscriptionId}`);
        await stripe.subscriptions.cancel(userData.stripeSubscriptionId);
        console.log('✅ Stripe subscription canceled');
      } catch (stripeError) {
        console.error('❌ Failed to cancel Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }
    
    // Step 2: Delete all user data from Firebase
    await deleteAllUserData(userId!);
    
    // Step 3: Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(userId!);
      console.log('✅ Firebase Auth user deleted');
    } catch (authError) {
      console.error('❌ Failed to delete Firebase Auth user:', authError);
    }
    
    // Track successful API usage
    await trackAPIUsage('/api/account/delete', userId, Date.now() - startTime, 200);
    
    return NextResponse.json({
      success: true,
      message: 'Account permanently deleted. All data has been removed.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Delete account error:', error);
    
    // Track failed API usage
    await trackAPIUsage('/api/account/delete', userId, Date.now() - startTime, 500);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 }
    );
  }
}

async function deleteAllUserData(userId: string) {
  console.log(`🗑️ Starting complete data deletion for user: ${userId}`);
  
  const batch = adminDb.batch();
  
  // Delete main user profile
  const userProfileRef = adminDb.collection('profiles').doc(userId);
  batch.delete(userProfileRef);
  
  // Delete user's recipes subcollection
  const userRecipesSnapshot = await adminDb
    .collection('profiles')
    .doc(userId)
    .collection('recipes')
    .get();
  
  userRecipesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete user's daily meal plans subcollection
  const dailyMealPlansSnapshot = await adminDb
    .collection('profiles')
    .doc(userId)
    .collection('dailyMealPlans')
    .get();
  
  dailyMealPlansSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete any other user subcollections that might exist
  const subcollections = ['pantryItems', 'shoppingList', 'weightLog', 'vitalsLog'];
  
  for (const subcollection of subcollections) {
    try {
      const snapshot = await adminDb
        .collection('profiles')
        .doc(userId)
        .collection(subcollection)
        .get();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.log(`📝 Subcollection ${subcollection} not found or empty`);
    }
  }
  
  // Execute all deletions
  await batch.commit();
  console.log('✅ All user data deleted from Firebase');
}