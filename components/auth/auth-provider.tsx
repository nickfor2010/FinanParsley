"use client"

import type React from "react"

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
    // Check for auth_success in localStorage to prevent redirect loops
    const authSuccess = localStorage.getItem("auth_success")
    console.log("Initial auth_success:", authSuccess)

    const getSession = async () => {
      try {
        console.log("Getting session...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
        }

        console.log("Session retrieved:", session ? "Session exists" : "No session")

        if (session) {
          console.log("User authenticated:", session.user.email)
          setSession(session)
          setUser(session.user)

          // Clear the auth_success flag once we've confirmed the session
          localStorage.removeItem("auth_success")
          console.log("auth_success removed from localStorage")
        } else {
          setSession(null)
          setUser(null)

          // If we previously had a successful auth but now don't have a session,
          // there might be an issue with cookies or storage
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

    // Set up the auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
