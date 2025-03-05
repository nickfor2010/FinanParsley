import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"

export async function middleware(req: NextRequest) {
  // Create a Supabase client
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res, cookies })

  try {
    // Get the session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get the current path
    const path = req.nextUrl.pathname

    // Protect dashboard routes
    if (path.startsWith("/dashboard")) {
      if (!session) {
        console.log("No session for dashboard, redirecting to /auth")
        return NextResponse.redirect(new URL("/auth", req.url))
      }
    }

    // Redirect logged-in users away from auth page
    if (path === "/auth" && session) {
      console.log("Logged in user on auth page, redirecting to /dashboard")
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return res
  } catch (e) {
    console.error("Middleware error:", e)
    return res
  }
}

// Specify routes to run middleware on
export const config = {
  matcher: ["/dashboard/:path*", "/auth"],
}
