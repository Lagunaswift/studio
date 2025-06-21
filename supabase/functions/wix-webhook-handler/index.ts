
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// Import Supabase client creator
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Deno will redirect to the latest v2.x

// Define the expected structure of the request body from Wix
// UPDATED based on sending eventType, startDate, duration
interface WixWebhookPayload {
  data?: { // The actual payload seems nested within 'data'
    secretKey?: string;
    userEmail?: string;
    planName?: string;
    // Removed: status?: string;
    eventType?: string; // Added: e.g., 'plan.started', 'plan.ended'
    // Removed: endDate?: string | number | Date;
    startDate?: string | number | Date; // Added: Plan start date
    duration?: string; // Added: Plan duration (e.g., "1 year", "30 days")
    // Add other fields Wix might send inside 'data'
  };
}

// Define the structure for data to update in your Supabase table
interface ProfileUpdateData {
  subscription_status: 'active' | 'inactive' | 'none'; // Use specific statuses
  plan_name?: string | null;
  subscription_end_date?: string | null; // ISO string format (set to null for now)
  subscription_start_date?: string | null; // Optional: store start date
  subscription_duration?: string | null; // Optional: store duration
  updated_at: string;
  // Add other fields from your 'profiles' table if needed
}


console.log("Wix Webhook Handler function starting up...")

// Retrieve secrets stored via `supabase secrets set`
const WIX_EXPECTED_SECRET = Deno.env.get('WIX_SHARED_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req: Request) => {
  console.log('--- wix-webhook-handler invoked ---');

  // 1. Check HTTP Method
  if (req.method !== 'POST') {
    console.log(`Received non-POST request: ${req.method}`)
    return new Response('Method Not Allowed', { status: 405 })
  }

  // 2. Parse Request Body
  let requestBody: WixWebhookPayload | null = null;
  try {
    requestBody = await req.json()
    console.log("Received webhook body:", JSON.stringify(requestBody, null, 2))
  } catch (e) {
    console.error("Failed to parse request body:", e)
    return new Response("Bad Request: Cannot parse JSON", { status: 400 })
  }

  // 3. Verify Secret Key
  const receivedSecret = requestBody?.data?.secretKey
  const expectedSecret = WIX_EXPECTED_SECRET;

  // Debug log
  console.log(`DEBUG: Comparing Received Secret ('${receivedSecret ? receivedSecret.substring(0,5)+'...' : 'None'}') with Expected Secret ('${expectedSecret ? expectedSecret.substring(0,5)+'...' : 'None/Not Set'}')`);

  if (!expectedSecret) {
    console.error("CRITICAL: WIX_SHARED_SECRET environment variable not set in Supabase Function secrets!")
    return new Response("Internal Server Error: Configuration missing", { status: 500 })
  }

  if (receivedSecret !== expectedSecret) {
    console.warn(`Webhook verification failed: Invalid secret received. Expected starts with '${expectedSecret.substring(0,5)}...' but received '${receivedSecret ? receivedSecret.substring(0,5)+'...' : 'None'}'`)
    return new Response("Unauthorized: Invalid secret", { status: 401 })
  }

  console.log("Webhook secret verified successfully!")

  // 4. Extract Data from Wix Payload (Using new fields)
  const userEmail = requestBody?.data?.userEmail
  const planName = requestBody?.data?.planName
  const eventType = requestBody?.data?.eventType      // <<< Get eventType
  // Removed: const status = requestBody?.data?.status
  const startDateRaw = requestBody?.data?.startDate;    // <<< Get startDate
  const duration = requestBody?.data?.duration;        // <<< Get duration
  // Removed: const subscriptionEndDateRaw = requestBody?.data?.endDate;

  if (!userEmail) {
      console.error("Missing userEmail in webhook payload data")
      return new Response("Bad Request: Missing userEmail", { status: 400 })
  }

  // 5. --- Implement Supabase Database Update Logic ---
  try {
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
      .from('profiles') // <<< YOUR PROFILES TABLE NAME
      .select('id')     // <<< YOUR COLUMN STORING THE AUTH USER ID
      .eq('email', userEmail) // <<< YOUR COLUMN STORING THE EMAIL (ensure this is correct!)
      .single()

    if (profileError || !profileData) {
        console.error(`Error or profile not found for ${userEmail}:`, profileError?.message || 'Not found')
        // Decide if 404 or 500 is appropriate if profile not found
        return new Response(`User profile not found for email: ${userEmail}`, { status: 404 })
    }

    const userId = profileData.id
    console.log(`Found user ID: ${userId} for email: ${userEmail}`)

    // b. Prepare data to update based on Wix eventType
    //    IMPORTANT: Adapt this logic based on the actual eventType values you send
    let determinedStatus: ProfileUpdateData['subscription_status'] = 'inactive'; // Sensible default? Or 'none'?
    if (eventType === 'plan.started') { // Check the eventType from the webhook
        determinedStatus = 'active';
    } else if (eventType === 'plan.ended' || eventType === 'plan.canceled') { // Anticipate other events
        determinedStatus = 'inactive';
    }
    // Add more conditions based on other eventTypes you might send

    const updateData: Partial<ProfileUpdateData> = { // Use Partial if some fields are optional
      subscription_status: determinedStatus,
      updated_at: new Date().toISOString(),
    };

    if (planName) {
      updateData.plan_name = planName;
    }

    // Optionally store start date (ensure column exists in Supabase profiles table)
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

    // Optionally store duration (ensure column exists in Supabase profiles table)
    if (duration) {
        updateData.subscription_duration = duration;
    } else {
        updateData.subscription_duration = null;
    }

    // Set end date to null for now, calculation is complex/unreliable without more info
    updateData.subscription_end_date = null;

    console.log(`Prepared update data for user ${userId}:`, updateData);

    // c. Update the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles') // <<< YOUR PROFILES/SUBSCRIPTIONS TABLE NAME
      .update(updateData)
      .eq('id', userId) // <<< Match the user ID column

    if (updateError) {
      console.error(`Database update error for user ${userId}:`, updateError)
      throw updateError;
    }

    console.log(`Successfully updated subscription status for user ${userId} (${userEmail}) to ${updateData.subscription_status}`)

  } catch (dbError) {
    console.error("Error during database operation:", dbError)
    let errorMessage = 'Unknown DB error';
    if (dbError instanceof Error) {
        errorMessage = dbError.message;
    }
    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 })
  }
  // --- End DB Update Logic ---

  // 6. Return Success Response to Wix
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
