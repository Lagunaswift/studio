import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define the expected structure of the request body from Wix
interface WixWebhookPayload {
  secretKey?: string;
  userEmail?: string;
  planName?: string;
  eventType?: string;
  startDate?: string | number | Date;
  duration?: string;
}

// Define the structure for data to update in your Supabase table
interface ProfileUpdateData {
  subscription_status: 'active' | 'inactive' | 'none';
  plan_name?: string | null;
  subscription_end_date?: string | null;
  subscription_start_date?: string | null;
  subscription_duration?: string | null;
  updated_at: string;
}

console.log("Wix Webhook Handler function starting up...")

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retrieve secrets stored via `supabase secrets set`
const WIX_EXPECTED_SECRET = Deno.env.get('WIX_SHARED_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('--- wix-webhook-handler invoked ---');

    // 1. Check HTTP Method
    if (req.method !== 'POST') {
      console.log(`Received non-POST request: ${req.method}`)
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }

    // 2. Parse Request Body
    let requestBody: WixWebhookPayload | null = null;
    try {
      requestBody = await req.json()
      console.log("Received webhook body:", JSON.stringify(requestBody, null, 2))
    } catch (e) {
      console.error("Failed to parse request body:", e)
      return new Response("Bad Request: Cannot parse JSON", { status: 400, headers: corsHeaders })
    }

    // 3. Verify Secret Key
    const receivedSecret = requestBody?.secretKey
    const expectedSecret = WIX_EXPECTED_SECRET;

    console.log(`DEBUG: Received Secret ('${receivedSecret ? String(receivedSecret).substring(0,5)+'...' : 'None'}', type: ${typeof receivedSecret})`);
    console.log(`DEBUG: Expected Secret ('${expectedSecret ? String(expectedSecret).substring(0,5)+'...' : 'None/Not Set'}', type: ${typeof expectedSecret})`);

    if (!expectedSecret) {
      console.error("CRITICAL: WIX_SHARED_SECRET environment variable not set in Supabase Function secrets!")
      return new Response("Internal Server Error: Configuration missing", { status: 500, headers: corsHeaders })
    }

    if (receivedSecret !== expectedSecret) {
      console.warn(`Webhook verification failed: Invalid secret received. Secrets do not match.`);
      return new Response("Unauthorized: Invalid secret", { status: 401, headers: corsHeaders })
    }

    console.log("Webhook secret verified successfully!")

    // 4. Extract Data from Wix Payload
    const userEmail = requestBody?.userEmail
    const planName = requestBody?.planName
    const eventType = requestBody?.eventType
    const startDateRaw = requestBody?.startDate;
    const duration = requestBody?.duration;

    if (!userEmail) {
        console.error("Missing userEmail in webhook payload")
        return new Response("Bad Request: Missing userEmail", { status: 400, headers: corsHeaders })
    }

    // 5. --- Implement Supabase Database Update Logic ---
    // Check if Supabase credentials are set
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase URL or Service Role Key environment variable not set.')
    }

    // Create Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })

    console.log(`Processing event: ${eventType || 'Unknown'} for user: ${userEmail}`)

    // a. Find the user's ID in Supabase based on the email from Wix
    console.log(`Looking up profile for email: ${userEmail}`)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (profileError) {
      console.error(`DATABASE LOOKUP ERROR for email ${userEmail}:`, profileError.message);
      return new Response('Internal Server Error while finding profile', { status: 500, headers: corsHeaders });
    }

    if (!profileData) {
      console.warn(`Profile not found for email: ${userEmail}. The user may need to sign up in the app first.`);
      return new Response(`User profile not found for email: ${userEmail}`, { status: 404, headers: corsHeaders });
    }

    const userId = profileData.id
    console.log(`Found user ID: ${userId} for email: ${userEmail}`)

    // b. Prepare data to update based on Wix eventType
    let determinedStatus: ProfileUpdateData['subscription_status'] = 'inactive';
    if (eventType === 'plan.started') {
        determinedStatus = 'active';
    } else if (eventType === 'plan.ended' || eventType === 'plan.canceled') {
        determinedStatus = 'inactive';
    }

    const updateData: Partial<ProfileUpdateData> = {
      subscription_status: determinedStatus,
      updated_at: new Date().toISOString(),
    };

    if (planName) {
      updateData.plan_name = planName;
    }

    if (startDateRaw) {
        try {
            updateData.subscription_start_date = new Date(startDateRaw).toISOString();
        } catch (dateError) {
            console.warn(`Could not parse startDate from Wix: ${startDateRaw}`, dateError);
            updateData.subscription_start_date = null;
        }
    } else {
        updateData.subscription_start_date = null;
    }

    if (duration) {
      updateData.subscription_duration = duration;
    } else {
      updateData.subscription_duration = null;
    }

    updateData.subscription_end_date = null;

    console.log(`Prepared update data for user ${userId}:`, updateData);

    // c. Update the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error(`Database update error for user ${userId}:`, updateError)
      throw updateError;
    }

    console.log(`Successfully updated subscription status for user ${userId} (${userEmail}) to ${updateData.subscription_status}`)

    // 6. Return Success Response to Wix
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("General error in function execution:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})