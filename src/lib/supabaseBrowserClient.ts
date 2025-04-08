import { createBrowserClient } from '@supabase/ssr'

// Ensure environment variables are set (can be duplicated here or imported from a shared config if preferred)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Function to create a Supabase client for Client Components
// This function is safe to import in client-side code
export const createClientClient = () => {
  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  );
}
