import { createClient } from "@supabase/supabase-js"

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Log Supabase configuration (without exposing full keys)
console.log("Supabase URL configured:", !!supabaseUrl)
console.log("Supabase Anon Key configured:", !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing!")
}

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "financial-monitor-auth",
  },
})

// Types for our data
export type Profile = {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role?: string
  created_at: string
}

export type Category = {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export type Expense = {
  id: number
  date: string
  category_id: number
  description: string
  quantity?: number
  unit?: string
  amount: number
  cost_per_100g?: number
  supplier_id?: number
  note?: string
  created_at: string
  updated_at: string
  // Join fields
  category_name?: string
}

// Helper functions for data fetching with improved error handling
export async function fetchProfile(userId: string) {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) throw error
    return data as Profile
  } catch (error) {
    console.error("Error fetching profile:", error)
    throw error
  }
}

export async function fetchCategories() {
  try {
    const { data, error } = await supabase.from("categories").select("id, name")

    if (error) throw error
    return data as Category[]
  } catch (error) {
    console.error("Error fetching categories:", error)
    // Return empty array instead of throwing to prevent cascading failures
    return []
  }
}

export async function fetchExpenses(dateFrom?: string, dateTo?: string) {
  try {
    let query = supabase
      .from("expenses")
      .select(`
        *,
        categories:category_id (
          name
        )
      `)
      .order("date", { ascending: false })

    if (dateFrom) {
      query = query.gte("date", dateFrom)
    }

    if (dateTo) {
      query = query.lte("date", dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform the data to flatten the category name
    return (data || []).map((expense) => ({
      ...expense,
      category_name: expense.categories?.name,
    })) as Expense[]
  } catch (error) {
    console.error("Error fetching expenses:", error)
    // Return empty array instead of throwing
    return []
  }
}

export async function fetchExpensesByYear(year: number) {
  try {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    return fetchExpenses(startDate, endDate)
  } catch (error) {
    console.error("Error fetching expenses by year:", error)
    return []
  }
}

export async function fetchExpensesByCategory() {
  try {
    const { data, error } = await supabase.from("expenses").select(`
        category_id,
        categories:category_id (
          name
        ),
        amount
      `)

    if (error) throw error

    // Group expenses by category and sum amounts
    const categoryTotals: Record<number, { category_id: number; category_name: string; total: number }> = {}

    if (!data || data.length === 0) {
      return []
    }

    data.forEach((expense) => {
      const categoryId = expense.category_id
      const categoryName = expense.categories?.name || "Unknown"
      const amount = expense.amount || 0

      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = {
          category_id: categoryId,
          category_name: categoryName,
          total: 0,
        }
      }

      categoryTotals[categoryId].total += amount
    })

    return Object.values(categoryTotals)
  } catch (error) {
    console.error("Error fetching expenses by category:", error)
    return []
  }
}

export async function fetchMonthlyExpenses(year: number) {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("date, amount")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)

    if (error) throw error

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

    if (!data || data.length === 0) {
      return Object.entries(monthlyTotals).map(([month, total]) => ({
        month,
        total,
      }))
    }

    data.forEach((expense) => {
      const date = new Date(expense.date)
      const month = date.toLocaleString("default", { month: "short" })
      monthlyTotals[month] += expense.amount || 0
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

export async function fetchTotalExpenses(dateFrom?: string, dateTo?: string) {
  try {
    let query = supabase.from("expenses").select("amount")

    if (dateFrom) {
      query = query.gte("date", dateFrom)
    }

    if (dateTo) {
      query = query.lte("date", dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    if (!data || data.length === 0) {
      return 0
    }

    return data.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  } catch (error) {
    console.error("Error fetching total expenses:", error)
    return 0
  }
}

export async function insertExpense(expense: Omit<Expense, "id" | "created_at" | "updated_at">) {
  try {
    const { data, error } = await supabase.from("expenses").insert(expense).select()

    if (error) throw error
    return data[0] as Expense
  } catch (error) {
    console.error("Error inserting expense:", error)
    throw error
  }
}

export async function updateExpense(id: number, expense: Partial<Expense>) {
  try {
    const { data, error } = await supabase.from("expenses").update(expense).eq("id", id).select()

    if (error) throw error
    return data[0] as Expense
  } catch (error) {
    console.error("Error updating expense:", error)
    throw error
  }
}

export async function deleteExpense(id: number) {
  try {
    const { error } = await supabase.from("expenses").delete().eq("id", id)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error deleting expense:", error)
    throw error
  }
}

