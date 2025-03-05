"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { startOfMonth, endOfMonth, eachMonthOfInterval, subYears } from "date-fns"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Download, AlertCircle, Calendar, ArrowDown, ArrowUp } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchExpenses } from "@/lib/supabase"
import { fetchRevenueByMonth } from "@/lib/supabase-revenue"
import { ChartContainer } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportPeriod, setReportPeriod] = useState<"month" | "quarter" | "year">("month")
  const [reportType, setReportType] = useState<"profit-loss" | "revenue-expense" | "category">("profit-loss")

  // Report data
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([])
  const [profitLossData, setProfitLossData] = useState<any[]>([])

  // Date ranges for filtering
  const dateRanges = useMemo(() => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()

    // Last 12 months
    const lastYearDate = subYears(currentDate, 1)
    const monthsRange = eachMonthOfInterval({
      start: startOfMonth(lastYearDate),
      end: endOfMonth(currentDate),
    })

    return {
      currentDate,
      currentYear,
      monthsRange,
      lastYearDate,
    }
  }, [])

  // Generate profit/loss report data
  const generateProfitLossData = useCallback((revenueData: any[], expenseData: any[]) => {
    // Create a map of months for easier lookup
    const revenueByMonth: Record<string, number> = {}
    const expensesByMonth: Record<string, number> = {}

    revenueData.forEach((item) => {
      revenueByMonth[item.month] = item.totalRevenue
    })

    expenseData.forEach((item) => {
      expensesByMonth[item.month] = item.total
    })

    // Combine data for all months
    const allMonths = [...new Set([...Object.keys(revenueByMonth), ...Object.keys(expensesByMonth)])].sort()

    return allMonths.map((month) => {
      const revenue = revenueByMonth[month] || 0
      const expenses = expensesByMonth[month] || 0
      const profit = revenue - expenses

      return {
        month,
        revenue,
        expenses,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      }
    })
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log("Fetching report data for year:", dateRanges.currentYear)

        // Fetch revenue and expense data for the current year
        const [revenueByMonth, monthlyExpensesData] = await Promise.all([
          fetchRevenueByMonth(dateRanges.currentYear),
          fetchMonthlyExpenses(dateRanges.currentYear),
        ])

        console.log("Revenue data:", revenueByMonth)
        console.log("Expense data:", monthlyExpensesData)

        setMonthlyRevenue(revenueByMonth)
        setMonthlyExpenses(monthlyExpensesData)

        // Generate profit/loss report
        const profitLossReport = generateProfitLossData(revenueByMonth, monthlyExpensesData)
        setProfitLossData(profitLossReport)
      } catch (err) {
        console.error("Error loading report data:", err)
        setError(err instanceof Error ? err.message : "Failed to load report data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRanges.currentYear, generateProfitLossData])

  // Helper function to fetch monthly expenses
  async function fetchMonthlyExpenses(year: number) {
    try {
      // Use the existing fetchExpenses function to get all expenses
      const expenses = await fetchExpenses()

      // Group expenses by month and sum amounts
      const monthlyTotals: Record<string, number> = {
        Jan: 0,
        Feb: 0,
        Mar: 0,
        Apr: 0,
        May: 0,
        Jun: 0,
        Jul: 0,
        Aug: 0,
        Sep: 0,
        Oct: 0,
        Nov: 0,
        Dec: 0,
      }

      if (!expenses || expenses.length === 0) {
        return Object.entries(monthlyTotals).map(([month, total]) => ({
          month,
          total,
        }))
      }

      expenses.forEach((expense) => {
        const date = new Date(expense.date)
        if (date.getFullYear() === year) {
          const month = date.toLocaleString("default", { month: "short" })
          monthlyTotals[month] += expense.amount || 0
        }
      })

      return Object.entries(monthlyTotals).map(([month, total]) => ({
        month,
        total,
      }))
    } catch (error) {
      console.error("Error fetching monthly expenses:", error)
      return []
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Generating reports...</p>
        </div>
      </DashboardLayout>
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
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="w-full md:w-[200px]">
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                <SelectItem value="revenue-expense">Revenue vs Expenses</SelectItem>
                <SelectItem value="category">Category Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[200px]">
            <Select value={reportPeriod} onValueChange={(value: any) => setReportPeriod(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {reportType === "profit-loss" && "Profit & Loss Summary"}
                  {reportType === "revenue-expense" && "Revenue vs Expenses Summary"}
                  {reportType === "category" && "Category Analysis Summary"}
                </CardTitle>
                <CardDescription>
                  {reportPeriod === "month" && "Monthly breakdown for the last 12 months"}
                  {reportPeriod === "quarter" && "Quarterly breakdown for the last year"}
                  {reportPeriod === "year" && "Yearly breakdown"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportType === "profit-loss" && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(profitLossData.reduce((sum, item) => sum + item.revenue, 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">Last 12 months</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(profitLossData.reduce((sum, item) => sum + item.expenses, 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">Last 12 months</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(profitLossData.reduce((sum, item) => sum + item.profit, 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">Last 12 months</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const totalRevenue = profitLossData.reduce((sum, item) => sum + item.revenue, 0)
                          const totalProfit = profitLossData.reduce((sum, item) => sum + item.profit, 0)
                          const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

                          return (
                            <>
                              <div className="text-2xl font-bold">{formatPercentage(profitMargin)}</div>
                              <p className="text-xs text-muted-foreground">
                                <span
                                  className={
                                    profitMargin > 0
                                      ? "text-green-500 flex items-center"
                                      : "text-red-500 flex items-center"
                                  }
                                >
                                  {profitMargin > 0 ? (
                                    <ArrowUp className="mr-1 h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="mr-1 h-4 w-4" />
                                  )}
                                  Overall margin
                                </span>
                              </p>
                            </>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {reportType === "revenue-expense" && (
                  <div className="h-[300px]">
                    <ChartContainer
                      config={{
                        revenue: {
                          label: "Revenue",
                          color: "#10B981",
                        },
                        expenses: {
                          label: "Expenses",
                          color: "#EF4444",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profitLossData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="revenue" fill="var(--color-revenue)" name="Revenue" />
                          <Bar dataKey="expenses" fill="var(--color-expenses)" name="Expenses" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}

                {reportType === "category" && (
                  <div className="text-center py-8 text-muted-foreground">Category analysis will be displayed here</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {reportType === "profit-loss" && "Profit & Loss Details"}
                  {reportType === "revenue-expense" && "Revenue vs Expenses Details"}
                  {reportType === "category" && "Category Analysis Details"}
                </CardTitle>
                <CardDescription>Detailed breakdown by {reportPeriod}</CardDescription>
              </CardHeader>
              <CardContent>
                {reportType === "profit-loss" && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Expenses</TableHead>
                          <TableHead className="text-right">Profit/Loss</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profitLossData.map((item) => (
                          <TableRow key={item.month}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.expenses)}</TableCell>
                            <TableCell
                              className={`text-right font-medium ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatCurrency(item.profit)}
                            </TableCell>
                            <TableCell className="text-right">{formatPercentage(item.profitMargin)}</TableCell>
                          </TableRow>
                        ))}

                        {/* Totals row */}
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(profitLossData.reduce((sum, item) => sum + item.revenue, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(profitLossData.reduce((sum, item) => sum + item.expenses, 0))}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              profitLossData.reduce((sum, item) => sum + item.profit, 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(profitLossData.reduce((sum, item) => sum + item.profit, 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const totalRevenue = profitLossData.reduce((sum, item) => sum + item.revenue, 0)
                              const totalProfit = profitLossData.reduce((sum, item) => sum + item.profit, 0)
                              return formatPercentage(totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0)
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {(reportType === "revenue-expense" || reportType === "category") && (
                  <div className="text-center py-8 text-muted-foreground">
                    Detailed {reportType === "revenue-expense" ? "revenue vs expenses" : "category"} analysis will be
                    displayed here
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Previous Period</Button>
                <Button variant="outline">Next Period</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {reportType === "profit-loss" && "Profit & Loss Chart"}
                  {reportType === "revenue-expense" && "Revenue vs Expenses Chart"}
                  {reportType === "category" && "Category Analysis Chart"}
                </CardTitle>
                <CardDescription>Visual representation of your financial data</CardDescription>
              </CardHeader>
              <CardContent>
                {reportType === "profit-loss" && (
                  <div className="h-[400px]">
                    <ChartContainer
                      config={{
                        revenue: {
                          label: "Revenue",
                          color: "#10B981",
                        },
                        expenses: {
                          label: "Expenses",
                          color: "#EF4444",
                        },
                        profit: {
                          label: "Profit",
                          color: "#3B82F6",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={profitLossData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" name="Revenue" />
                          <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" name="Expenses" />
                          <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" name="Profit" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}

                {(reportType === "revenue-expense" || reportType === "category") && (
                  <div className="text-center py-8 text-muted-foreground">
                    {reportType === "revenue-expense" ? "Revenue vs expenses" : "Category"} chart will be displayed here
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

