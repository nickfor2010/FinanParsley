"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
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
  const pathname = usePathname()

  useEffect(() => {
    const handleAuthStateChange = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Session retrieval error:", error)
          setIsLoading(false)
          return
        }

        // Update session and user state
        setSession(session)
        setUser(session?.user || null)

        // Automatic routing based on session
        if (session && pathname === '/auth') {
          router.replace('/dashboard')
        } else if (!session && pathname.startsWith('/dashboard')) {
          router.replace('/auth')
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Unexpected error in auth state check:", err)
        setIsLoading(false)
      }
    }

    // Initial session check
    handleAuthStateChange()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event)
      
      setSession(session)
      setUser(session?.user || null)

      // Routing logic
      if (session && pathname === '/auth') {
        router.replace('/dashboard')
      } else if (!session && pathname.startsWith('/dashboard')) {
        router.replace('/auth')
      }
    })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [pathname, router])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
