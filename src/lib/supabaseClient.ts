import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'; // Import necessary type

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// This file now only contains server-side client functions.
// Client-side function moved to supabaseBrowserClient.ts

// Function to create a Supabase client for Server Components, Route Handlers, Server Actions
// Requires passing the cookie store
export const createServerActionClient = (cookieStore: ReadonlyRequestCookies) => {
  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          // The `delete` method from `next/headers` cookies store typically only takes the name.
          // The options are sometimes handled implicitly or not supported for removal.
          cookieStore.delete(name);
        },
      },
    }
  )
}

// Function to create a Supabase client specifically for Server Components (using next/headers)
// Note: This might cause issues if used outside of the component rendering lifecycle (e.g., in utility functions)
// Prefer passing cookieStore where possible (like in Server Actions/Route Handlers)
export const createServerComponentClient = async () => { // Make async
    const cookieStore = await cookies() // Await the promise
    return createServerActionClient(cookieStore);
}

// --- Deprecated Basic Client (Keep for reference or specific cases if needed, but prefer context-specific clients) ---
// import { createClient as createBasicClient } from '@supabase/supabase-js';
// export const supabase = createBasicClient(supabaseUrl, supabaseAnonKey);
// --- End Deprecated ---
