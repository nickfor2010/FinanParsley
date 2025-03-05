"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Search, AlertCircle, ShoppingBag, Store, GraduationCap } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchOrders, fetchMarkets, fetchCourses } from "@/lib/supabase-revenue"

export default function RevenuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Revenue data states
  const [orders, setOrders] = useState<any[]>([])
  const [markets, setMarkets] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])

  // Filtering
  const [searchTerm, setSearchTerm] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<any[]>([])
  const [filteredCourses, setFilteredCourses] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all revenue data in parallel
        const [ordersData, marketsData, coursesData] = await Promise.all([
          fetchOrders(),
          fetchMarkets(),
          fetchCourses(),
        ])

        setOrders(ordersData)
        setMarkets(marketsData)
        setCourses(coursesData)
        setFilteredOrders(ordersData)
        setFilteredMarkets(marketsData)
        setFilteredCourses(coursesData)
      } catch (err) {
        console.error("Error loading revenue data:", err)
        setError(err instanceof Error ? err.message : "Failed to load revenue data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Apply filters when search term or source filter changes
  useEffect(() => {
    // Filter orders
    const orderResults = orders.filter((order) => {
      const matchesSearch = searchTerm === "" || order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSource = sourceFilter === "all" || sourceFilter === "orders"
      return matchesSearch && matchesSource
    })

    // Filter markets
    const marketResults = markets.filter((market) => {
      const matchesSearch = searchTerm === "" || market.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSource = sourceFilter === "all" || sourceFilter === "markets"
      return matchesSearch && matchesSource
    })

    // Filter courses
    const courseResults = courses.filter((course) => {
      const matchesSearch = searchTerm === "" || course.course_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSource = sourceFilter === "all" || sourceFilter === "courses"
      return matchesSearch && matchesSource
    })

    setFilteredOrders(orderResults)
    setFilteredMarkets(marketResults)
    setFilteredCourses(courseResults)
  }, [searchTerm, sourceFilter, orders, markets, courses])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading revenue data...</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <Button onClick={() => router.push("/dashboard/revenue/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Revenue
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Transactions</CardTitle>
            <CardDescription>View and manage all revenue sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search revenue..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-[200px]">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="markets">Markets</SelectItem>
                    <SelectItem value="courses">Courses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Revenue</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="markets">Markets</TabsTrigger>
                <TabsTrigger value="courses">Courses</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Orders */}
                      {filteredOrders.map((order) => (
                        <TableRow key={`order-${order.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 text-blue-500" />
                              <span>Order</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">Order #{order.order_number}</TableCell>
                          <TableCell>{format(new Date(order.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${(order.total_amount + (order.shipping_cost || 0)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Markets */}
                      {filteredMarkets.map((market) => (
                        <TableRow key={`market-${market.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-green-500" />
                              <span>Market</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{market.name}</TableCell>
                          <TableCell>{format(new Date(market.end_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${market.final_incoming.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Courses */}
                      {filteredCourses.map((course) => (
                        <TableRow key={`course-${course.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-yellow-500" />
                              <span>Course</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{course.course_name}</TableCell>
                          <TableCell>{format(new Date(course.date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${course.total_amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredOrders.length === 0 && filteredMarkets.length === 0 && filteredCourses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No revenue transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Shipping</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>{format(new Date(order.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  // Adjust these conditions based on your actual enum values
                                  ["PAID", "COMPLETED", "SETTLED", "PROCESSED", "APPROVED"].includes(
                                    order.payment_status?.toUpperCase(),
                                  )
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {order.payment_status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">${order.total_amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${(order.shipping_cost || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              ${(order.total_amount + (order.shipping_cost || 0)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="markets" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Market Name</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMarkets.length > 0 ? (
                        filteredMarkets.map((market) => (
                          <TableRow key={market.id}>
                            <TableCell className="font-medium">{market.name}</TableCell>
                            <TableCell>{format(new Date(market.end_date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              ${market.final_incoming.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            No markets found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="courses" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                          <TableRow key={course.id}>
                            <TableCell className="font-medium">{course.course_name}</TableCell>
                            <TableCell>{format(new Date(course.date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              ${course.total_amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            No courses found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

