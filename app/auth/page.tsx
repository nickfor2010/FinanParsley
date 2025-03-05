"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AuthForm from "@/components/auth/auth-form"
import DebugInfo from "@/components/debug-info"
import { supabase } from "@/lib/supabase"

export default function AuthPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          // User is already logged in, redirect to dashboard
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setIsChecking(false)
      }
    }

    checkSession()
  }, [router])

  if (isChecking) {
    return <div className="flex justify-center items-center min-h-screen">Checking authentication...</div>
  }

  return (
    <div>
      <AuthForm />
      <div className="flex justify-center">
        <DebugInfo />
      </div>
    </div>
  )
}

