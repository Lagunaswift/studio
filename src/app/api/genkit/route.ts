import { proCoachFlow } from '@/ai/flows/pro-coach-flow';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, createAuthenticatedResponse } from '@/lib/auth-helpers';
import { trackAPIUsage } from '@/lib/api-monitoring';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Define input validation schema to match the ProCoachInputSchema in schemas.ts
const ProCoachInputSchema = z.object({
  primaryGoal: z.enum(['fatLoss', 'muscleGain', 'maintenance', 'notSpecified']),
  targetWeightChangeRateKg: z.number(),
  dynamicTdee: z.number().positive(),
  actualAvgCalories: z.number().positive(),
  actualWeeklyWeightChangeKg: z.number(),
  currentProteinTarget: z.number().nonnegative(),
  currentFatTarget: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  // Authenticate request
  const authResult = await authenticateRequest(req);
  const authError = createAuthenticatedResponse(authResult);
  if (authError) return authError;
  
  const userId = authResult.user?.uid;
  
  try {
    // Validate request body exists and is JSON
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    // Validate input property exists
    if (!('input' in body)) {
      return NextResponse.json(
        { error: 'Missing required "input" property in request body' },
        { status: 400 }
      );
    }

    // Validate input schema
    let validatedInput;
    try {
      validatedInput = ProCoachInputSchema.parse(body.input);
    } catch (error) {
      console.error('Input validation failed:', error);
      return NextResponse.json(
        { 
          error: 'Invalid input format',
          details: error instanceof z.ZodError ? error.errors : 'Validation failed'
        },
        { status: 400 }
      );
    }

    // Execute the Genkit flow with proper error handling
    let result;
    try {
      result = await proCoachFlow(validatedInput);
    } catch (error) {
      console.error('Pro coach flow execution failed:', error);
      
      // Handle different types of flow errors
      if (error instanceof Error) {
        // Check for specific Genkit or flow-related errors
        if (error.message.includes('timeout')) {
          return NextResponse.json(
            { error: 'Request timeout - please try again' },
            { status: 408 }
          );
        }
        
        if (error.message.includes('validation')) {
          return NextResponse.json(
            { error: 'Input validation failed in flow execution' },
            { status: 400 }
          );
        }
      }
      
      // Generic flow execution error
      return NextResponse.json(
        { error: 'Failed to process request. Please try again later.' },
        { status: 500 }
      );
    }

    // Validate that we got a result
    if (result === undefined || result === null) {
      console.error('Flow returned null/undefined result');
      return NextResponse.json(
        { error: 'No result generated. Please try again.' },
        { status: 500 }
      );
    }

    // Track successful API usage
    await trackAPIUsage('/api/genkit', userId, Date.now() - startTime, 200);
    
    // Return successful result
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    // Track failed API usage
    await trackAPIUsage('/api/genkit', userId, Date.now() - startTime, 500);
    
    // Catch-all error handler for unexpected issues
    console.error('Unexpected error in pro-coach API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add other HTTP methods if needed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
