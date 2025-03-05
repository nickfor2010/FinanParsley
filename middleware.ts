import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next()

  // Create a Supabase client
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Get the session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get the current path
    const path = req.nextUrl.pathname

    // Redirect logic
    if (path.startsWith("/dashboard")) {
      // If no session, redirect to auth
      if (!session) {
        console.log("No session found, redirecting to /auth")
        return NextResponse.redirect(new URL("/auth", req.url))
      }
    } else if (path === "/auth" && session) {
      // If already logged in and on auth page, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return res
  } catch (e) {
    console.error("Error in middleware:", e)
    return res
  }
}

// Run middleware on dashboard and auth routes
export const config = {
  matcher: ["/dashboard/:path*", "/auth"],
}
