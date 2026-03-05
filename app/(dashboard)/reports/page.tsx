'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format, startOfDay, addDays, addHours } from 'date-fns'
import { parseUTCDate } from '@/lib/utils/date'
import { DollarSign, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

interface ShiftDay {
  date: string // The shift day identifier (e.g., "2026-03-02")
  startTime: Date // 9:00 AM on date
  endTime: Date // 4:30 AM next day
  purchases: Purchase[]
  totalAmount: number
  purchaseCount: number
}

export default function ReportsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()
  
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 3 // Show 3 shift days per page

  useEffect(() => {
    if (!user) return

    const fetchPurchases = async () => {
      try {
        // Fetch ALL purchases using pagination (Supabase has 1000 row limit per request)
        let allPurchases: Purchase[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('admin_user_id', user.id)
            // Include ALL purchases (even soft-deleted ones) for complete historical reports
            .order('purchase_date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (error) throw error

          if (data && data.length > 0) {
            allPurchases = [...allPurchases, ...data]
            hasMore = data.length === pageSize // Continue if we got a full page
            page++
          } else {
            hasMore = false
          }
        }
        
        // Debug logging
        console.log('Total purchases fetched:', allPurchases.length)
        if (allPurchases.length > 0) {
          const dates = allPurchases.map(p => p.purchase_date).sort()
          console.log('Earliest purchase:', dates[0])
          console.log('Latest purchase:', dates[dates.length - 1])
          console.log('Purchases before Feb 22:', allPurchases.filter(p => p.purchase_date < '2026-02-22').length)
        }
        
        setPurchases(allPurchases)
      } catch (error) {
        console.error('Error fetching purchases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPurchases()
  }, [user, supabase])

  // Group purchases by shift day (9 AM - 4:30 AM cycle)
  const shiftDays = useMemo(() => {
    if (purchases.length === 0) return []

    const shiftDayMap = new Map<string, ShiftDay>()

    purchases.forEach((purchase) => {
      const purchaseDate = parseUTCDate(purchase.purchase_date)
      
      // Determine which shift day this purchase belongs to
      let shiftDayDate: Date
      const hour = purchaseDate.getHours()
      
      if (hour >= 0 && hour < 9) {
        // Between midnight and 9 AM - belongs to previous day's shift
        shiftDayDate = startOfDay(addDays(purchaseDate, -1))
      } else {
        // 9 AM or later - belongs to today's shift
        shiftDayDate = startOfDay(purchaseDate)
      }

      const shiftDayKey = format(shiftDayDate, 'yyyy-MM-dd')

      if (!shiftDayMap.has(shiftDayKey)) {
        shiftDayMap.set(shiftDayKey, {
          date: shiftDayKey,
          startTime: addHours(shiftDayDate, 9), // 9:00 AM
          endTime: addHours(addDays(shiftDayDate, 1), 4.5), // 4:30 AM next day
          purchases: [],
          totalAmount: 0,
          purchaseCount: 0,
        })
      }

      const shiftDay = shiftDayMap.get(shiftDayKey)!
      shiftDay.purchases.push(purchase)
      shiftDay.totalAmount += purchase.amount
      shiftDay.purchaseCount++
    })

    // Convert to array and sort by date (most recent first)
    return Array.from(shiftDayMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [purchases])

  const totalAllShifts = useMemo(() => {
    return shiftDays.reduce((sum, day) => sum + day.totalAmount, 0)
  }, [shiftDays])

  // Paginate shift days - show only 3 per page
  const paginatedShiftDays = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return shiftDays.slice(startIndex, endIndex)
  }, [shiftDays, currentPage, itemsPerPage])

  const totalPages = Math.ceil(shiftDays.length / itemsPerPage)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-gray-600 mt-2">Shift Day Analysis</p>
        </div>
        <Card className="p-8">
          <div className="text-center text-gray-500">Loading...</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-2">Shift Day Analysis (9:00 AM - 4:30 AM cycles)</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Shift Days</p>
              <p className="text-2xl font-bold mt-1">{shiftDays.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Purchases</p>
              <p className="text-2xl font-bold mt-1">{purchases.length}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spending</p>
              <p className="text-2xl font-bold mt-1 text-green-600">
                ${totalAllShifts.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Shift Days Table */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Shift Days</h2>
              <p className="text-sm text-gray-500 mt-1">
                Each shift day runs from 9:00 AM to 4:30 AM (next day)
              </p>
            </div>
            {shiftDays.length > itemsPerPage && (
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({shiftDays.length} total shift days)
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Day</TableHead>
                <TableHead>Time Period</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Avg per Purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedShiftDays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No purchases found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedShiftDays.map((shiftDay) => {
                  const avgAmount = shiftDay.totalAmount / shiftDay.purchaseCount
                  const isToday = format(new Date(), 'yyyy-MM-dd') === shiftDay.date

                  return (
                    <TableRow key={shiftDay.date} className={isToday ? 'bg-blue-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {format(new Date(shiftDay.date), 'MMM dd, yyyy')}
                          {isToday && (
                            <Badge className="bg-blue-600">Today</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(shiftDay.startTime, 'h:mm a')} - {format(shiftDay.endTime, 'h:mm a')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{shiftDay.purchaseCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ${shiftDay.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        ${avgAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {shiftDays.length > itemsPerPage && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, shiftDays.length)} of {shiftDays.length} shift days
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm font-medium px-3">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
