
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Hardcoding keys like this is not recommended for production.
// It's better to use environment variables (e.g., .env.local and Vercel/Netlify environment settings).
// I am using the values you provided directly for now.
// Please consider moving these to environment variables as soon as possible.

const supabaseUrl = "YOUR_SUPABASE_URL"; // <-- PASTE YOUR SUPABASE URL HERE
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"; // <-- PASTE YOUR SUPABASE ANON KEY HERE

if (!supabaseUrl) {
  console.error("Supabase URL is missing! Check src/lib/supabaseClient.ts");
  throw new Error("Supabase URL is missing. Ensure it is set correctly in src/lib/supabaseClient.ts or via environment variables.");
}

if (!supabaseAnonKey) {
  console.error("Supabase Anon Key is missing! Check src/lib/supabaseClient.ts");
  throw new Error("Supabase Anon Key is missing. Ensure it is set correctly in src/lib/supabaseClient.ts or via environment variables.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase client initialized.");
if (typeof window !== 'undefined') {
  console.log("Supabase URL (from client init):", supabase.supabaseUrl);
  // Avoid logging the key itself, but confirm client is made
  console.log("Supabase client instance created successfully.");
}
