// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    const { data: { session } } = await supabase.auth.getSession()

    res.headers.set("x-auth-debug", session ? "has-session" : "no-session")

    if (req.nextUrl.pathname.startsWith("/dashboard") && !session) {
      console.log("No session found, redirecting to /auth")
      return NextResponse.redirect(new URL("/auth", req.url))
    }

    return res
  } catch (e) {
    console.error("Error in middleware:", e)
    return res
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
