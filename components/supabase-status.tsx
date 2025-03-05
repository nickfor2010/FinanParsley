"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function SupabaseStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const checkConnection = async () => {
      try {
        // Simple query to check if we can connect to Supabase
        const { data, error } = await supabase.from("expenses").select("id").limit(1)

        if (error) {
          throw error
        }

        if (isMounted) {
          setStatus("connected")
        }
      } catch (err) {
        console.error("Supabase connection error:", err)
        if (isMounted) {
          setStatus("error")
          setErrorMessage(err instanceof Error ? err.message : "Could not connect to Supabase")
        }
      }
    }

    checkConnection()

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array - only run once on mount

  if (status === "loading") {
    return null
  }

  if (status === "error") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>
          {errorMessage || "Could not connect to the database"}
          <div className="mt-2">
            <p className="text-sm">Please check your Supabase configuration and ensure the database is accessible.</p>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle>Connected</AlertTitle>
      <AlertDescription>Successfully connected to Supabase database</AlertDescription>
    </Alert>
  )
}

