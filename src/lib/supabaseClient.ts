
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// This function creates a new Supabase client instance.
// It should be called on the client-side where process.env is available.
export const createClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials are not set. Please check your .env file and ensure they are prefixed with NEXT_PUBLIC_.");
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};
