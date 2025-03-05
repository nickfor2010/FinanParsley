"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Search, Plus, AlertCircle } from "lucide-react"
import { fetchExpenses, fetchCategories, type Expense, type Category } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ExpensesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)

  // Memoize the filter function to prevent recreating it on every render
  const applyFilters = useCallback(() => {
    let filtered = [...expenses]

    if (searchTerm) {
      filtered = filtered.filter((expense) => expense.description.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category_id === Number.parseInt(categoryFilter))
    }

    setFilteredExpenses(filtered)
  }, [expenses, searchTerm, categoryFilter])

  // Load data only once when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if Supabase URL and key are set
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error("Supabase credentials are not configured properly")
        }

        const [expensesData, categoriesData] = await Promise.all([fetchExpenses(), fetchCategories()])

        setExpenses(expensesData)
        setFilteredExpenses(expensesData)
        setCategories(categoriesData)
      } catch (err) {
        console.error("Error loading data:", err)
        setError(err instanceof Error ? err.message : "Failed to load expense data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, []) // Empty dependency array - only run once on mount

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters()
  }, [applyFilters]) // This will run when searchTerm, categoryFilter, or expenses change

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading expense data...</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <Button onClick={() => router.push("/dashboard/expenses/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>View and manage all expense entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-[200px]">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => {
                      const category = categories.find((c) => c.id === expense.category_id)
                      return (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{category?.name || "Uncategorized"}</TableCell>
                          <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No expenses found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

