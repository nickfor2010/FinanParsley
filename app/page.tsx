import { redirect } from "next/navigation"

export default function Home() {
  // Later we'll add authentication check here
  // For now, redirect to dashboard
  redirect("/dashboard")
}

