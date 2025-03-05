import { supabase } from "./supabase"

// Types for revenue data
export type Order = {
  id: number
  order_number: string
  created_at: string
  customer_id: number
  status: string
  order_type: string
  payment_status: string // Changed from "paid" | "unpaid" to string to be more flexible
  payment_method: string
  delivery_method: string
  total_amount: number
  shipping_cost: number
  notes?: string
  created_by?: string
  updated_at?: string
  pickup_date?: string
  delivery_address?: string
  amount_received?: number
}

export type Market = {
  id: number
  name: string
  location: string
  start_date: string
  end_date: string
  final_incoming: number
  result?: string
  created_at: string
  organization_name?: string
  commission_to_pay?: number
  fee?: number
}

export type Course = {
  id: number
  date: string
  course_name: string
  duration?: string
  location?: string
  max_participants?: number
  registration_fee?: number
  total_amount: number
  course_description?: string
  materials_needed?: string
  instructor_name?: string
  created_at: string
  updated_at?: string
}

export type RevenueSummary = {
  totalRevenue: number
  orderRevenue: number
  marketRevenue: number
  courseRevenue: number
  currentMonthRevenue: number
  previousMonthRevenue: number
  percentChange: number
}

export type RevenueByMonth = {
  month: string
  orderRevenue: number
  marketRevenue: number
  courseRevenue: number
  totalRevenue: number
}

export type RevenueBySource = {
  source: string
  amount: number
  percentage: number
}

// Fetch orders with revenue data
export async function fetchOrders(dateFrom?: string, dateTo?: string) {
  try {
    let query = supabase
      .from("orders")
      .select("id, order_number, created_at, payment_status, total_amount, shipping_cost")
      // Remove the hard-coded payment_status filter since "paid" is not a valid enum value
      .order("created_at", { ascending: false })

    if (dateFrom) {
      query = query.gte("created_at", dateFrom)
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    // Filter orders with payment_status that indicates payment was received
    // This allows us to be flexible with whatever enum values your database uses
    // Adjust these conditions based on your actual enum values
    // Common values might be "PAID", "COMPLETED", "SETTLED", etc.
    const paidOrders =
      data?.filter((order) => {
        const paidStatuses = ["PAID", "COMPLETED", "SETTLED", "PROCESSED", "APPROVED"]
        return paidStatuses.includes(order.payment_status?.toUpperCase())
      }) || []

    return paidOrders as Order[]
  } catch (error) {
    console.error("Error fetching orders:", error)
    return []
  }
}

// Fetch markets with revenue data
export async function fetchMarkets(dateFrom?: string, dateTo?: string) {
  try {
    let query = supabase
      .from("markets")
      .select("id, name, end_date, final_incoming, created_at")
      .order("end_date", { ascending: false })

    if (dateFrom) {
      query = query.gte("end_date", dateFrom)
    }

    if (dateTo) {
      query = query.lte("end_date", dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return data as Market[]
  } catch (error) {
    console.error("Error fetching markets:", error)
    return []
  }
}

// Fetch courses with revenue data
export async function fetchCourses(dateFrom?: string, dateTo?: string) {
  try {
    let query = supabase
      .from("courses")
      .select("id, date, course_name, total_amount, created_at")
      .order("date", { ascending: false })

    if (dateFrom) {
      query = query.gte("date", dateFrom)
    }

    if (dateTo) {
      query = query.lte("date", dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return data as Course[]
  } catch (error) {
    console.error("Error fetching courses:", error)
    return []
  }
}

// Calculate revenue summary
export async function fetchRevenueSummary(dateFrom?: string, dateTo?: string) {
  try {
    const [orders, markets, courses] = await Promise.all([
      fetchOrders(dateFrom, dateTo),
      fetchMarkets(dateFrom, dateTo),
      fetchCourses(dateFrom, dateTo),
    ])

    const orderRevenue = orders.reduce((sum, order) => sum + (order.total_amount + (order.shipping_cost || 0)), 0)
    const marketRevenue = markets.reduce((sum, market) => sum + (market.final_incoming || 0), 0)
    const courseRevenue = courses.reduce((sum, course) => sum + (course.total_amount || 0), 0)
    const totalRevenue = orderRevenue + marketRevenue + courseRevenue

    return {
      totalRevenue,
      orderRevenue,
      marketRevenue,
      courseRevenue,
      orderCount: orders.length,
      marketCount: markets.length,
      courseCount: courses.length,
    }
  } catch (error) {
    console.error("Error calculating revenue summary:", error)
    return {
      totalRevenue: 0,
      orderRevenue: 0,
      marketRevenue: 0,
      courseRevenue: 0,
      orderCount: 0,
      marketCount: 0,
      courseCount: 0,
    }
  }
}

// Get revenue by month for the current year
export async function fetchRevenueByMonth(year: number) {
  try {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const [orders, markets, courses] = await Promise.all([
      fetchOrders(startDate, endDate),
      fetchMarkets(startDate, endDate),
      fetchCourses(startDate, endDate),
    ])

    // Initialize monthly data
    const monthlyData: Record<string, RevenueByMonth> = {}
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    months.forEach((month, index) => {
      monthlyData[month] = {
        month,
        orderRevenue: 0,
        marketRevenue: 0,
        courseRevenue: 0,
        totalRevenue: 0,
      }
    })

    // Process orders
    orders.forEach((order) => {
      const date = new Date(order.created_at)
      const month = date.toLocaleString("default", { month: "short" })
      monthlyData[month].orderRevenue += order.total_amount + (order.shipping_cost || 0)
      monthlyData[month].totalRevenue += order.total_amount + (order.shipping_cost || 0)
    })

    // Process markets
    markets.forEach((market) => {
      const date = new Date(market.end_date)
      const month = date.toLocaleString("default", { month: "short" })
      monthlyData[month].marketRevenue += market.final_incoming || 0
      monthlyData[month].totalRevenue += market.final_incoming || 0
    })

    // Process courses
    courses.forEach((course) => {
      const date = new Date(course.date)
      const month = date.toLocaleString("default", { month: "short" })
      monthlyData[month].courseRevenue += course.total_amount || 0
      monthlyData[month].totalRevenue += course.total_amount || 0
    })

    return Object.values(monthlyData)
  } catch (error) {
    console.error("Error fetching revenue by month:", error)
    return []
  }
}

// Get revenue by source
export async function fetchRevenueBySource(dateFrom?: string, dateTo?: string) {
  try {
    const summary = await fetchRevenueSummary(dateFrom, dateTo)

    const totalRevenue = summary.totalRevenue || 1 // Avoid division by zero

    const sources: RevenueBySource[] = [
      {
        source: "Orders",
        amount: summary.orderRevenue,
        percentage: (summary.orderRevenue / totalRevenue) * 100,
      },
      {
        source: "Markets",
        amount: summary.marketRevenue,
        percentage: (summary.marketRevenue / totalRevenue) * 100,
      },
      {
        source: "Courses",
        amount: summary.courseRevenue,
        percentage: (summary.courseRevenue / totalRevenue) * 100,
      },
    ]

    return sources
  } catch (error) {
    console.error("Error fetching revenue by source:", error)
    return []
  }
}

// Get month-over-month revenue comparison
export async function fetchMonthOverMonthRevenue() {
  try {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    // Current month date range
    const currentMonthStart = new Date(currentYear, currentMonth, 1)
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0)

    // Previous month date range
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1)
    const previousMonthEnd = new Date(currentYear, currentMonth, 0)

    const formatDate = (date: Date) => {
      return date.toISOString().split("T")[0]
    }

    const [currentMonthSummary, previousMonthSummary] = await Promise.all([
      fetchRevenueSummary(formatDate(currentMonthStart), formatDate(currentMonthEnd)),
      fetchRevenueSummary(formatDate(previousMonthStart), formatDate(previousMonthEnd)),
    ])

    const currentMonthRevenue = currentMonthSummary.totalRevenue
    const previousMonthRevenue = previousMonthSummary.totalRevenue

    const percentChange =
      previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0

    return {
      currentMonthRevenue,
      previousMonthRevenue,
      percentChange,
    }
  } catch (error) {
    console.error("Error fetching month-over-month revenue:", error)
    return {
      currentMonthRevenue: 0,
      previousMonthRevenue: 0,
      percentChange: 0,
    }
  }
}

// Get recent revenue transactions
export async function fetchRecentRevenueTransactions(limit = 5) {
  try {
    const [orders, markets, courses] = await Promise.all([fetchOrders(), fetchMarkets(), fetchCourses()])

    // Transform orders
    const orderTransactions = orders.map((order) => ({
      id: `order-${order.id}`,
      date: new Date(order.created_at),
      description: `Order #${order.order_number}`,
      amount: order.total_amount + (order.shipping_cost || 0),
      type: "Order",
    }))

    // Transform markets
    const marketTransactions = markets.map((market) => ({
      id: `market-${market.id}`,
      date: new Date(market.end_date),
      description: `Market: ${market.name}`,
      amount: market.final_incoming,
      type: "Market",
    }))

    // Transform courses
    const courseTransactions = courses.map((course) => ({
      id: `course-${course.id}`,
      date: new Date(course.date),
      description: `Course: ${course.course_name}`,
      amount: course.total_amount,
      type: "Course",
    }))

    // Combine and sort by date (newest first)
    const allTransactions = [...orderTransactions, ...marketTransactions, ...courseTransactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit)

    return allTransactions
  } catch (error) {
    console.error("Error fetching recent revenue transactions:", error)
    return []
  }
}

