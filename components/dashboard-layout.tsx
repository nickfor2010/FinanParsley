"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { BarChart3, DollarSign, Menu, Home, FileText, CreditCard, LogOut, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"
import SupabaseStatus from "@/components/supabase-status"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showStatus, setShowStatus] = useState(true)

  useEffect(() => {
    setIsMounted(true)
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => {
      window.removeEventListener("resize", checkScreenSize)
    }
  }, [])

  // Hide status after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStatus(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  if (!isMounted) {
    return null
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Revenue", href: "/dashboard/revenue", icon: TrendingUp },
    { name: "Expenses", href: "/dashboard/expenses", icon: CreditCard },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  ]

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "U"

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
              pathname === item.href ? "bg-muted text-primary font-medium" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation for mobile */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2 px-2">
                <DollarSign className="h-6 w-6" />
                <span className="text-lg font-semibold">Financial Monitor</span>
              </div>
              <nav className="grid gap-2 px-2">
                <NavLinks />
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 md:hidden" />
          <span className="text-lg font-semibold md:hidden">Financial Monitor</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex flex-1">
        {/* Sidebar for desktop */}
        <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <DollarSign className="h-6 w-6" />
              <span>Financial Monitor</span>
            </Link>
          </div>
          <nav className="grid gap-2 p-4 text-sm">
            <NavLinks />
          </nav>
        </aside>
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {showStatus && (
            <div className="p-4 md:px-6 md:pt-6 pb-0">
              <SupabaseStatus />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

