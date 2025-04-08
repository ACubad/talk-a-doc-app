import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Corrected pattern: Modify the single 'response' object directly.
        set(name: string, value: string, options: CookieOptions) {
          // Forward the request cookies modification (optional but good practice)
          request.cookies.set({ name, value, ...options });
          // Set the cookie on the response object initialized outside the handlers
          response.cookies.set({ name, value, ...options });
        },
        // Corrected pattern: Modify the single 'response' object directly.
        remove(name: string, options: CookieOptions) {
          // Forward the request cookies modification (optional but good practice)
          request.cookies.set({ name, value: '', ...options });
          // Set the cookie removal on the response object initialized outside the handlers
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  await supabase.auth.getSession();

  return response
}

// Ensure the middleware is only called for relevant paths.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
