// components/auth/auth-provider.tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const authSuccess = localStorage.getItem("auth_success")

    const getSession = async () => {
      try {
        console.log("Getting session...")
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
        }

        console.log("Session retrieved:", session ? "Session exists" : "No session")

        if (session) {
          console.log("User authenticated:", session.user.email)
          setSession(session)
          setUser(session.user)
          localStorage.removeItem("auth_success")
        } else {
          setSession(null)
          setUser(null)
          if (authSuccess === "true") {
            console.warn("Auth success was recorded but no session found")
          }
        }
      } catch (err) {
        console.error("Unexpected error in getSession:", err)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event)

      if (session) {
        console.log("User authenticated via state change:", session.user.email)
        setSession(session)
        setUser(session.user)
      } else {
        setSession(null)
        setUser(null)
      }

      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      console.log("User signed out")
      window.location.href = "/auth"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return <AuthContext.Provider value={{ user, session, isLoading, signOut }}>{children}</AuthContext.Provider>
}
