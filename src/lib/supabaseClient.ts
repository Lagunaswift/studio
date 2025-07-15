import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Read Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the environment variables are set
if (!supabaseUrl) {
  // This warning is helpful for developers during build and in browser console.
  console.warn("Supabase URL is missing! Ensure NEXT_PUBLIC_SUPABASE_URL is set in your .env file or environment variables.");
}

if (!supabaseAnonKey) {
  // This warning is helpful for developers during build and in browser console.
  console.warn("Supabase Anon Key is missing! Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your .env file or environment variables.");
}

// Create and export the Supabase client. 
// It's okay if the URL/key are undefined here initially, 
// as the AuthContext will handle re-initialization on the client-side.
export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
