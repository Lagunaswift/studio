<<<<<<< HEAD
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const expectedSecret = Deno.env.get('WIX_SHARED_SECRET');
    if (!expectedSecret) {
      console.error("CRITICAL: WIX_SHARED_SECRET is not set.");
      return new Response('Internal Server Error: Secret not configured.', { status: 500 });
    }

    const payload = await req.json();
    const receivedSecret = payload.secretKey;

    if (!receivedSecret || receivedSecret.trim() !== expectedSecret.trim()) {
      console.warn(`[SECURITY] Request verification FAILED. Secret mismatch.`);
      return new Response("Unauthorized: Invalid secret key", { status: 401 });
    }
=======
// supabase/functions/wix-webhook-handler/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interface for the flat key-value structure sent by the Wix "Send HTTP Request" action
interface WixHttpRequestPayload {
  secretKey?: string;
  userEmail?: string;
  planName?: string;
  eventType?: string;
  startDate?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('--- Wix HTTP Request Handler invoked ---');

  // --- 1. GET SECRET FROM ENVIRONMENT ---
  const expectedSecret = Deno.env.get('WIX_SHARED_SECRET');
  if (!expectedSecret) {
    console.error("CRITICAL: WIX_SHARED_SECRET is not set in environment variables.");
    return new Response('Internal Server Error: Secret not configured', { status: 500 });
  }

  // --- 2. SECURITY VERIFICATION ---
  try {
    // This function expects a simple JSON body, not a cryptographic signature
    const payload: WixHttpRequestPayload = await req.json();
    console.log("[DEBUG] Received request body:", JSON.stringify(payload, null, 2));

    const receivedSecret = payload.secretKey;

    // Compare the secret sent from Wix with the one stored in Supabase secrets
    if (!receivedSecret || receivedSecret.trim() !== expectedSecret.trim()) {
      console.warn(`[SECURITY] Request verification FAILED. Secret mismatch or missing.`);
      console.log(`[DEBUG] Received: '${receivedSecret}' | Expected: '${expectedSecret}'`);
      return new Response("Unauthorized: Invalid secret key", { status: 401, headers: corsHeaders });
    }

    console.log("[SECURITY] Secret key verified successfully!");

    // --- 3. DATA PROCESSING ---
    const { userEmail, planName, eventType, startDate } = payload;
>>>>>>> 7cf6d16c6a73d8248d78a0fd3dfef247eb948ea9

    console.log("[SECURITY] Secret key verified.");

    const { userEmail, planName, eventType, startDate } = payload;
    if (!userEmail) {
<<<<<<< HEAD
      return new Response("Bad Request: Missing userEmail", { status: 400 });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const subscriptionStatus = eventType === 'plan.started' ? 'active' : 'inactive';

=======
      console.error("Missing 'userEmail' in request payload");
      return new Response("Bad Request: Missing userEmail", { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const subscriptionStatus = (eventType === 'plan.started') ? 'active' : 'inactive';

>>>>>>> 7cf6d16c6a73d8248d78a0fd3dfef247eb948ea9
    const updateData = {
      subscription_status: subscriptionStatus,
      plan_name: planName,
      subscription_start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
<<<<<<< HEAD
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin.from('profiles').update(updateData).eq('email', userEmail);

    // *** THIS IS THE FIX ***
    // We handle the error by returning a response instead of throwing.
    if (error) {
      console.error("Critical error during database update:", error.message);
      return new Response(JSON.stringify({
        success: false,
        message: "Database update failed.",
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Success case
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Critical error in function execution:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
=======
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('email', userEmail);

    if (updateError) {
      console.error(`Database update error for user ${userEmail}:`, updateError);
      throw updateError;
    }

    console.log(`Successfully updated subscription for user ${userEmail}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("General error in function execution:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
>>>>>>> 7cf6d16c6a73d8248d78a0fd3dfef247eb948ea9
