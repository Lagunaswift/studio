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

// !!! IMPORTANT DEBUGGING STEP - DO NOT USE IN PRODUCTION !!!
// We are temporarily hardcoding the secret to bypass potential environment variable issues.
const HARDCODED_WIX_SECRET = 'e9b98b56ee100acf204d0bfb12666a1a29b1cfdc18b9';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('--- wix-webhook-handler invoked ---');

    let requestBody: WixWebhookPayload | null = null;
    try {
      requestBody = await req.json()
      console.log("[DEBUG] Full received webhook body:", JSON.stringify(requestBody, null, 2))
    } catch (e) {
      console.error("Failed to parse request body:", e)
      return new Response("Bad Request: Cannot parse JSON", { status: 400, headers: corsHeaders })
    }

    // --- SECURITY VERIFICATION ---
    const receivedSecret = requestBody?.secretKey
    const expectedSecret = HARDCODED_WIX_SECRET; // Using the hardcoded secret for debugging

    console.log(`[DEBUG] Received Secret Key: '${receivedSecret}' (Type: ${typeof receivedSecret})`)
    console.log(`[DEBUG] Expected (Hardcoded) Secret Key: '${expectedSecret}' (Type: ${typeof expectedSecret})`)

    if (receivedSecret?.trim() !== expectedSecret?.trim()) {
      console.warn(`[SECURITY] Webhook verification FAILED. Secrets do not match.`);
      return new Response("Unauthorized: Invalid secret", { status: 401, headers: corsHeaders })
    }

    console.log("[SECURITY] Webhook secret verified successfully!")

    // --- DATA PROCESSING ---
    const userEmail = requestBody?.userEmail
    const planName = requestBody?.planName
    const eventType = requestBody?.eventType
    const startDateRaw = requestBody?.startDate;
    const duration = requestBody?.duration;

    if (!userEmail) {
        console.error("Missing userEmail in webhook payload")
        return new Response("Bad Request: Missing userEmail", { status: 400, headers: corsHeaders })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("CRITICAL: Supabase credentials (URL or Service Key) are not set in environment variables.")
      throw new Error('Supabase credentials missing.')
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })

    console.log(`Processing event: ${eventType || 'Unknown'} for user: ${userEmail}`)

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

    if (planName) updateData.plan_name = planName;
    if (duration) updateData.subscription_duration = duration; else updateData.subscription_duration = null;
    updateData.subscription_end_date = null;

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


    console.log(`Prepared update data for user ${userId}:`, updateData);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error(`Database update error for user ${userId}:`, updateError)
      throw updateError;
    }

    console.log(`Successfully updated subscription status for user ${userId} (${userEmail}) to ${updateData.subscription_status}`)

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
