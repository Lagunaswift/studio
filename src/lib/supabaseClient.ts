
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the environment variables are set
if (!supabaseUrl) {
  console.error("Supabase URL is missing! Ensure NEXT_PUBLIC_SUPABASE_URL is set in your .env file.");
  throw new Error("Supabase URL is missing. Please check your environment variables.");
}

if (!supabaseAnonKey) {
  console.error("Supabase Anon Key is missing! Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your .env file.");
  throw new Error("Supabase Anon Key is missing. Please check your environment variables.");
}

// Create and export the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
