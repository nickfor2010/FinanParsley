"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subYears, addMonths } from "date-fns"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, TrendingUp, TrendingDown, AlertCircle, BarChart3, LineChartIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchExpenses, fetchExpensesByCategory, fetchMonthlyExpenses } from "@/lib/supabase"
import { fetchRevenueByMonth } from "@/lib/supabase-revenue"
import { ChartContainer } from "@/components/ui/chart"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "2y">("1y")

  // Analytics data
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [expenseData, setExpenseData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [combinedData, setCombinedData] = useState<any[]>([])
  const [forecastData, setForecastData] = useState<any[]>([])

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

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

  // Generate forecast data based on historical trends
  const generateForecast = useCallback(
    (historicalData: any[]) => {
      if (!historicalData.length) return []

      // Simple linear regression for forecasting
      // In a real app, you'd use more sophisticated methods
      const lastMonth = historicalData[historicalData.length - 1]
      const lastMonthDate = new Date(`${lastMonth.month} 1, ${dateRanges.currentYear}`)

      const forecast = []

      // Calculate average growth rate from last 3 months
      const lastThreeMonths = historicalData.slice(-3)
      let avgRevenueGrowth = 0
      let avgExpenseGrowth = 0

      if (lastThreeMonths.length >= 2) {
        for (let i = 1; i < lastThreeMonths.length; i++) {
          avgRevenueGrowth +=
            (lastThreeMonths[i].revenue - lastThreeMonths[i - 1].revenue) / lastThreeMonths[i - 1].revenue
          avgExpenseGrowth +=
            (lastThreeMonths[i].expenses - lastThreeMonths[i - 1].expenses) / lastThreeMonths[i - 1].expenses
        }
        avgRevenueGrowth = avgRevenueGrowth / (lastThreeMonths.length - 1)
        avgExpenseGrowth = avgExpenseGrowth / (lastThreeMonths.length - 1)
      }

      // Ensure growth rates are reasonable
      avgRevenueGrowth = Math.max(-0.2, Math.min(0.2, avgRevenueGrowth))
      avgExpenseGrowth = Math.max(-0.2, Math.min(0.2, avgExpenseGrowth))

      // Generate 6 months of forecast
      for (let i = 1; i <= 6; i++) {
        const forecastDate = addMonths(lastMonthDate, i)
        const month = format(forecastDate, "MMM")

        const forecastRevenue = lastMonth.revenue * Math.pow(1 + avgRevenueGrowth, i)
        const forecastExpenses = lastMonth.expenses * Math.pow(1 + avgExpenseGrowth, i)

        forecast.push({
          month,
          revenue: forecastRevenue,
          expenses: forecastExpenses,
          profit: forecastRevenue - forecastExpenses,
          isForecast: true,
        })
      }

      return forecast
    },
    [dateRanges.currentYear],
  )

  // Combine revenue and expense data
  const combineData = useCallback((revenueData: any[], expenseData: any[]) => {
    const combined: Record<string, any> = {}

    // Process revenue data
    revenueData.forEach((item) => {
      if (!combined[item.month]) {
        combined[item.month] = {
          month: item.month,
          revenue: 0,
          expenses: 0,
          profit: 0,
        }
      }
      combined[item.month].revenue = item.totalRevenue
    })

    // Process expense data
    expenseData.forEach((item) => {
      if (!combined[item.month]) {
        combined[item.month] = {
          month: item.month,
          revenue: 0,
          expenses: 0,
          profit: 0,
        }
      }
      combined[item.month].expenses = item.total
      combined[item.month].profit = combined[item.month].revenue - item.total
    })

    // Convert to array and sort by month
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return Object.values(combined).sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log("Fetching analytics data for year:", dateRanges.currentYear)

        // Fetch data for analytics
        const [revenueByMonth, monthlyExpensesData, categoryExpenses] = await Promise.all([
          fetchRevenueByMonth(dateRanges.currentYear),
          fetchMonthlyExpenses(dateRanges.currentYear),
          fetchExpensesByCategory(),
        ])

        console.log("Revenue data:", revenueByMonth)
        console.log("Expense data:", monthlyExpensesData)
        console.log("Category data:", categoryExpenses)

        setRevenueData(revenueByMonth)
        setExpenseData(monthlyExpensesData)
        setCategoryData(categoryExpenses)

        // Combine revenue and expense data
        const combined = combineData(revenueByMonth, monthlyExpensesData)
        setCombinedData(combined)

        // Generate forecast data
        const forecast = generateForecast(combined)
        setForecastData([...combined, ...forecast])
      } catch (err) {
        console.error("Error loading analytics data:", err)
        setError(err instanceof Error ? err.message : "Failed to load analytics data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRanges.currentYear, combineData, generateForecast])

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

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!combinedData.length)
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        profitMargin: 0,
        revenueGrowth: 0,
        expenseGrowth: 0,
      }

    const totalRevenue = combinedData.reduce((sum, item) => sum + item.revenue, 0)
    const totalExpenses = combinedData.reduce((sum, item) => sum + item.expenses, 0)
    const totalProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Calculate growth rates if we have at least 2 months of data
    let revenueGrowth = 0
    let expenseGrowth = 0

    if (combinedData.length >= 2) {
      const firstMonth = combinedData[0]
      const lastMonth = combinedData[combinedData.length - 1]

      revenueGrowth = firstMonth.revenue > 0 ? ((lastMonth.revenue - firstMonth.revenue) / firstMonth.revenue) * 100 : 0

      expenseGrowth =
        firstMonth.expenses > 0 ? ((lastMonth.expenses - firstMonth.expenses) / firstMonth.expenses) * 100 : 0
    }

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      profitMargin,
      revenueGrowth,
      expenseGrowth,
    }
  }, [combinedData])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Analyzing financial data...</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Financial Analytics</h1>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="2y">Last 2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
              <TrendingUp className={`h-4 w-4 ${metrics.revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {metrics.revenueGrowth >= 0 ? "+" : ""}
                {metrics.revenueGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Year-over-year growth</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expense Growth</CardTitle>
              <TrendingDown className={`h-4 w-4 ${metrics.expenseGrowth <= 0 ? "text-green-500" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.expenseGrowth <= 0 ? "text-green-600" : "text-red-600"}`}>
                {metrics.expenseGrowth >= 0 ? "+" : ""}
                {metrics.expenseGrowth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Year-over-year growth</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(metrics.profitMargin)}</div>
              <p className="text-xs text-muted-foreground">Overall margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <LineChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(metrics.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground">Total profit for period</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="correlation">Correlation</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Expense Trends</CardTitle>
                <CardDescription>Historical trends over time</CardDescription>
              </CardHeader>
              <CardContent>
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
                      <AreaChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--color-revenue)"
                          fill="var(--color-revenue)"
                          fillOpacity={0.2}
                          name="Revenue"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="var(--color-expenses)"
                          fill="var(--color-expenses)"
                          fillOpacity={0.2}
                          name="Expenses"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke="var(--color-profit)"
                          fill="var(--color-profit)"
                          fillOpacity={0.2}
                          name="Profit"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Forecast</CardTitle>
                <CardDescription>Projected revenue and expenses for the next 6 months</CardDescription>
              </CardHeader>
              <CardContent>
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
                      <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label, items) => {
                            const item = items[0]?.payload
                            return `${label}${item?.isForecast ? " (Forecast)" : ""}`
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--color-revenue)"
                          name="Revenue"
                          strokeDasharray={(item) => (item.isForecast ? "5 5" : "0")}
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          stroke="var(--color-expenses)"
                          name="Expenses"
                          strokeDasharray={(item) => (item.isForecast ? "5 5" : "0")}
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="var(--color-profit)"
                          name="Profit"
                          strokeDasharray={(item) => (item.isForecast ? "5 5" : "0")}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Note: Forecast is based on historical trends and may not reflect future performance accurately.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Distribution of expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="total"
                        nameKey="category_name"
                        label={({ category_name, percent }) => `${category_name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correlation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expense Correlation</CardTitle>
                <CardDescription>Relationship between revenue and expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="revenue" name="Revenue" unit="$" domain={["dataMin", "dataMax"]} />
                      <YAxis
                        type="number"
                        dataKey="expenses"
                        name="Expenses"
                        unit="$"
                        domain={["dataMin", "dataMax"]}
                      />
                      <ZAxis type="number" range={[100, 500]} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        cursor={{ strokeDasharray: "3 3" }}
                      />
                      <Legend />
                      <Scatter name="Monthly Data" data={combinedData} fill="#8884d8" shape="circle" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    This chart shows the correlation between revenue and expenses. Points closer to the diagonal line
                    indicate months where revenue and expenses are proportional.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

