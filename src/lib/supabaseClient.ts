//src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Read variables from the environment (Vercel will provide these)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This error will now correctly trigger if Vercel variables are missing
  throw new Error("Supabase credentials are not set. Please check your .env file and ensure they are prefixed with NEXT_PUBLIC_.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase client initialized from environment variables.");
