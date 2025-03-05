"use client"

import { useEffect, useState, useMemo } from "react"
import { format, subMonths, startOfMonth, endOfMonth, isValid } from "date-fns"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  CreditCard,
  TrendingUp,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Store,
  GraduationCap,
  Plus,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  fetchExpenses,
  fetchExpensesByCategory,
  fetchMonthlyExpenses,
  fetchTotalExpenses,
  type Expense,
} from "@/lib/supabase"
import { fetchRevenueSummary, fetchMonthOverMonthRevenue, fetchRecentRevenueTransactions } from "@/lib/supabase-revenue"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Safe date formatter that handles invalid dates
const safeFormatDate = (date: Date | string | number | null | undefined, formatStr: string, fallback = "N/A") => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    if (!isValid(dateObj)) return fallback
    return format(dateObj, formatStr)
  } catch (error) {
    console.error("Error formatting date:", error, date)
    return fallback
  }
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categoryExpenses, setCategoryExpenses] = useState<any[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastMonthTotal, setLastMonthTotal] = useState(0)
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0)

  // Revenue states
  const [revenueSummary, setRevenueSummary] = useState({
    totalRevenue: 0,
    orderRevenue: 0,
    marketRevenue: 0,
    courseRevenue: 0,
    orderCount: 0,
    marketCount: 0,
    courseCount: 0,
  })
  const [monthOverMonth, setMonthOverMonth] = useState({
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    percentChange: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  // Simple auth check
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("No user found in dashboard, redirecting to auth")
      router.push("/auth")
    }
  }, [user, isLoading, router])

  // Memoize date calculations to prevent recreating them on every render
  // Wrap in try-catch to handle any date-related errors
  const dateRanges = useMemo(() => {
    try {
      const currentDate = new Date()

      // Validate the date
      if (!isValid(currentDate)) {
        throw new Error("Current date is invalid")
      }

      const currentYear = currentDate.getFullYear()
      const lastMonthStart = startOfMonth(subMonths(currentDate, 1))
      const lastMonthEnd = endOfMonth(subMonths(currentDate, 1))
      const currentMonthStart = startOfMonth(currentDate)
      const currentMonthEnd = endOfMonth(currentDate)

      return {
        currentDate,
        currentYear,
        lastMonthStart,
        lastMonthEnd,
        currentMonthStart,
        currentMonthEnd,
        lastMonthStartFormatted: format(lastMonthStart, "yyyy-MM-dd"),
        lastMonthEndFormatted: format(lastMonthEnd, "yyyy-MM-dd"),
        currentMonthStartFormatted: format(currentMonthStart, "yyyy-MM-dd"),
        currentMonthEndFormatted: format(currentMonthEnd, "yyyy-MM-dd"),
      }
    } catch (error) {
      console.error("Error calculating date ranges:", error)
      // Provide fallback values
      const fallbackDate = new Date()
      return {
        currentDate: fallbackDate,
        currentYear: fallbackDate.getFullYear(),
        lastMonthStart: fallbackDate,
        lastMonthEnd: fallbackDate,
        currentMonthStart: fallbackDate,
        currentMonthEnd: fallbackDate,
        lastMonthStartFormatted: "2023-01-01",
        lastMonthEndFormatted: "2023-01-31",
        currentMonthStartFormatted: "2023-02-01",
        currentMonthEndFormatted: "2023-02-28",
      }
    }
  }, []) // Empty dependency array means this is calculated only once

  // Calculate month-over-month change percentage for expenses
  const expenseMonthOverMonthChange = useMemo(() => {
    return lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0
  }, [currentMonthTotal, lastMonthTotal])

  // Calculate net income (revenue - expenses) for current month
  const currentMonthNetIncome = useMemo(() => {
    return monthOverMonth.currentMonthRevenue - currentMonthTotal
  }, [monthOverMonth.currentMonthRevenue, currentMonthTotal])

  // Calculate net income change percentage
  const netIncomePercentChange = useMemo(() => {
    const previousMonthNetIncome = monthOverMonth.previousMonthRevenue - lastMonthTotal
    return previousMonthNetIncome !== 0
      ? ((currentMonthNetIncome - previousMonthNetIncome) / Math.abs(previousMonthNetIncome)) * 100
      : 0
  }, [currentMonthNetIncome, monthOverMonth.previousMonthRevenue, lastMonthTotal])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if Supabase URL and key are set
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error("Supabase credentials are not configured properly")
        }

        // Fetch all data in parallel
        const [
          expensesData,
          categoryData,
          monthlyData,
          total,
          lastMonthTotalAmount,
          currentMonthTotalAmount,
          revenueSummaryData,
          revenueMonthOverMonth,
          recentRevenueData,
        ] = await Promise.all([
          fetchExpenses(),
          fetchExpensesByCategory(),
          fetchMonthlyExpenses(dateRanges.currentYear),
          fetchTotalExpenses(),
          fetchTotalExpenses(dateRanges.lastMonthStartFormatted, dateRanges.lastMonthEndFormatted),
          fetchTotalExpenses(dateRanges.currentMonthStartFormatted, dateRanges.currentMonthEndFormatted),
          fetchRevenueSummary(),
          fetchMonthOverMonthRevenue(),
          fetchRecentRevenueTransactions(3),
        ])

        setExpenses(expensesData)
        setCategoryExpenses(categoryData)
        setMonthlyExpenses(monthlyData)
        setTotalExpenses(total)
        setLastMonthTotal(lastMonthTotalAmount)
        setCurrentMonthTotal(currentMonthTotalAmount)
        setRevenueSummary(revenueSummaryData)
        setMonthOverMonth(revenueMonthOverMonth)
        setRecentTransactions(recentRevenueData)
      } catch (err) {
        console.error("Error loading data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [
    user,
    dateRanges.currentMonthEndFormatted,
    dateRanges.currentYear,
    dateRanges.lastMonthStartFormatted,
    dateRanges.lastMonthEndFormatted,
    dateRanges.currentMonthStartFormatted,
  ])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                <p className="text-sm">
                  Please check your Supabase configuration and ensure the database is accessible.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/revenue/add")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Revenue
            </Button>
            <Button onClick={() => router.push("/dashboard/expenses/add")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Net Income Card */}
          <Card className={currentMonthNetIncome >= 0 ? "border-green-200" : "border-red-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income (This Month)</CardTitle>
              <DollarSign className={`h-4 w-4 ${currentMonthNetIncome >= 0 ? "text-green-500" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentMonthNetIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${Math.abs(currentMonthNetIncome).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    netIncomePercentChange > 0 ? "text-green-500 flex items-center" : "text-red-500 flex items-center"
                  }
                >
                  {netIncomePercentChange > 0 ? (
                    <ArrowUp className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDown className="mr-1 h-4 w-4" />
                  )}
                  {netIncomePercentChange > 0 ? "+" : ""}
                  {netIncomePercentChange.toFixed(1)}% vs. last month
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${monthOverMonth.currentMonthRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    monthOverMonth.percentChange > 0
                      ? "text-green-500 flex items-center"
                      : "text-red-500 flex items-center"
                  }
                >
                  {monthOverMonth.percentChange > 0 ? (
                    <ArrowUp className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDown className="mr-1 h-4 w-4" />
                  )}
                  {monthOverMonth.percentChange > 0 ? "+" : ""}
                  {monthOverMonth.percentChange.toFixed(1)}% vs. last month
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses (This Month)</CardTitle>
              <CreditCard className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${currentMonthTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    expenseMonthOverMonthChange > 0
                      ? "text-red-500 flex items-center"
                      : "text-green-500 flex items-center"
                  }
                >
                  {expenseMonthOverMonthChange > 0 ? (
                    <ArrowUp className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDown className="mr-1 h-4 w-4" />
                  )}
                  {expenseMonthOverMonthChange > 0 ? "+" : ""}
                  {expenseMonthOverMonthChange.toFixed(1)}% vs. last month
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${revenueSummary.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From {revenueSummary.orderCount + revenueSummary.marketCount + revenueSummary.courseCount} sources
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Financial Trends</CardTitle>
                  <CardDescription>Monthly revenue and expenses for {dateRanges.currentYear}</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[200px] md:h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Financial trends chart will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>By source</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] md:h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Revenue breakdown chart will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Recent Revenue</CardTitle>
                  <CardDescription>Latest revenue entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center gap-4 rounded-lg border p-3">
                        <div
                          className={`rounded-full p-2 ${
                            transaction.type === "Order"
                              ? "bg-blue-100"
                              : transaction.type === "Market"
                                ? "bg-green-100"
                                : "bg-yellow-100"
                          }`}
                        >
                          {transaction.type === "Order" ? (
                            <ShoppingBag className="h-4 w-4 text-blue-500" />
                          ) : transaction.type === "Market" ? (
                            <Store className="h-4 w-4 text-green-500" />
                          ) : (
                            <GraduationCap className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {safeFormatDate(transaction.date, "MMM d, yyyy")} • {transaction.type}
                          </p>
                        </div>
                        <div className="font-medium text-green-600">+${transaction.amount.toFixed(2)}</div>
                      </div>
                    ))}
                    {recentTransactions.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">No recent transactions found</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Latest expense entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {expenses.slice(0, 5).map((expense) => {
                      // Safely create a date object
                      let expenseDate
                      try {
                        expenseDate = new Date(expense.date)
                        if (!isValid(expenseDate)) {
                          expenseDate = new Date() // Fallback to current date
                        }
                      } catch (error) {
                        console.error("Invalid expense date:", expense.date)
                        expenseDate = new Date() // Fallback to current date
                      }

                      return (
                        <div key={expense.id} className="flex items-center gap-4 rounded-lg border p-3">
                          <div className="rounded-full p-2 bg-red-100">
                            <ArrowDown className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {safeFormatDate(expenseDate, "MMM d, yyyy")} • {expense.category_name || "Uncategorized"}
                            </p>
                          </div>
                          <div className="font-medium text-red-600">-${expense.amount.toFixed(2)}</div>
                        </div>
                      )
                    })}
                    {expenses.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">No expenses found</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>Breakdown by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-blue-500" />
                      <div className="flex flex-1 items-center justify-between">
                        <div className="font-medium">Orders</div>
                        <div>${revenueSummary.orderRevenue.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${
                            revenueSummary.totalRevenue > 0
                              ? (revenueSummary.orderRevenue / revenueSummary.totalRevenue) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{revenueSummary.orderCount} orders</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-green-500" />
                      <div className="flex flex-1 items-center justify-between">
                        <div className="font-medium">Markets</div>
                        <div>${revenueSummary.marketRevenue.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{
                          width: `${
                            revenueSummary.totalRevenue > 0
                              ? (revenueSummary.marketRevenue / revenueSummary.totalRevenue) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{revenueSummary.marketCount} markets</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 rounded-full bg-yellow-500" />
                      <div className="flex flex-1 items-center justify-between">
                        <div className="font-medium">Courses</div>
                        <div>${revenueSummary.courseRevenue.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-yellow-500"
                        style={{
                          width: `${
                            revenueSummary.totalRevenue > 0
                              ? (revenueSummary.courseRevenue / revenueSummary.totalRevenue) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{revenueSummary.courseCount} courses</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Breakdown of expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryExpenses.length > 0 ? (
                    categoryExpenses
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5)
                      .map((category, index) => (
                        <div key={category.category_id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="font-medium">{category.category_name || "Uncategorized"}</div>
                            <div>${category.total.toFixed(2)}</div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${(category.total / categoryExpenses[0]?.total) * 100}%`,
                                opacity: 1 - index * 0.15,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">No category data found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

