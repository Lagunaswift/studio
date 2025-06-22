
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Hardcoding keys like this is not recommended for production.
// It's better to use environment variables (e.g., .env.local and Vercel/Netlify environment settings).
// I am using the values you provided directly for now.
// Please consider moving these to environment variables as soon as possible.

const supabaseUrl = 'https://ruubwghugzcypxzqkfkx.supabase.co'; // <-- PASTE YOUR SUPABASE URL HERE
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dWJ3Z2h1Z3pjeXB4enFrZmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzI2MTEsImV4cCI6MjA2NjE0ODYxMX0.wBteNInm_ra2D8rQhK8Qe0kEPPZxf1L-8yTDlfXY-Ak'; // <-- PASTE YOUR SUPABASE ANON KEY HERE

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
