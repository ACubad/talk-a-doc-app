import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Define createClient function for server-side usage (Route Handlers, Server Components)
export function createClient() {
  // cookies() returns the ReadonlyRequestCookies object in this context
  const cookieStore = cookies()

  // Create and return the Supabase client instance
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Define the cookie handling functions using the cookieStore
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // The set method is called by Supabase when session is updated.
          // In Route Handlers, this works directly.
          // In Server Components, this might throw an error if called during render,
          // but can be ignored if middleware handles session refresh.
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.warn(`Server Supabase Client: Failed to set cookie '${name}' from a Server Component. This may be ignored if middleware is handling session refresh.`);
            // Handle or ignore error based on your setup
          }
        },
        remove(name: string, options: CookieOptions) {
          // The remove method is called by Supabase for logout etc.
          // Works directly in Route Handlers.
          // Similar Server Component considerations as 'set'.
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
             console.warn(`Server Supabase Client: Failed to remove cookie '${name}' from a Server Component. This may be ignored if middleware is handling session refresh.`);
            // Handle or ignore error based on your setup
          }
        },
      },
    }
  )
}
