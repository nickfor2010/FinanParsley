import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")

    console.log("Auth callback received, code exists:", !!code)

    if (code) {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        // Redirect to auth page with error
        return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url))
      }

      console.log("Successfully exchanged code for session")
    } else {
      console.warn("No code parameter found in callback URL")
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (err) {
    console.error("Unexpected error in auth callback:", err)
    return NextResponse.redirect(new URL("/auth?error=unexpected_error", request.url))
  }
}
