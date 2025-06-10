
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Hardcoding keys like this is not recommended for production.
// It's better to use environment variables (e.g., .env.local and Vercel/Netlify environment settings).
// I am using the values you provided directly for now.
// Please consider moving these to environment variables as soon as possible.

const supabaseUrl = "https://vlcmhbfkoyqhjbfsoicx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsY21oYmZrb3lxaGpiZnNvaWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MjQ2MTEsImV4cCI6MjA1OTUwMDYxMX0.RoO1p-oDVl3gEv_DV2YDLU8FMX0Lo9_4jpH_retdJpo";

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
