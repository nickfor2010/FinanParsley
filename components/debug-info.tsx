"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function DebugInfo() {
  const [showDebug, setShowDebug] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const checkEnvironment = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // Test Supabase connection
      const { data, error } = await supabase.from("categories").select("count").limit(1)

      setDebugInfo({
        environment: process.env.NODE_ENV,
        supabaseUrlConfigured: !!supabaseUrl,
        supabaseAnonKeyConfigured: !!supabaseAnonKey,
        supabaseConnection: error ? `Error: ${error.message}` : "Connected successfully",
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      })
    } catch (err) {
      setDebugInfo({
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setShowDebug(!showDebug)
          if (!debugInfo) checkEnvironment()
        }}
      >
        {showDebug ? "Hide Debug Info" : "Show Debug Info"}
      </Button>

      {showDebug && debugInfo && (
        <Card className="mt-2">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Environment and configuration details</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto p-2 bg-muted rounded-md">{JSON.stringify(debugInfo, null, 2)}</pre>
            <Button variant="outline" size="sm" className="mt-2" onClick={checkEnvironment}>
              Refresh Debug Info
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

