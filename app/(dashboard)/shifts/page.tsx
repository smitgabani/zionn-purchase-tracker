'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Trash2, DollarSign, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface CardShift {
  id: string
  card_id: string
  employee_id: string
  start_time: string
  end_time: string | null
  created_at: string
  cards: {
    last_four: string
    nickname: string | null
    bank_name: string
  }
  employees: {
    name: string
  }
}

interface Purchase {
  id: string
  card_id: string
  employee_id: string
  amount: number
  created_at: string
}

export default function ShiftsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()
  const [shifts, setShifts] = useState<CardShift[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchShifts()
      fetchPurchases()
    }
  }, [user])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('card_shifts')
        .select(`
          *,
          cards!inner(last_four, nickname, bank_name, admin_user_id),
          employees(name)
        `)
        .eq('cards.admin_user_id', user?.id)
        .order('start_time', { ascending: false })

      if (error) throw error
      setShifts(data || [])
    } catch (error: any) {
      console.error('Error fetching shifts:', error)
      toast.error('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, card_id, employee_id, amount, created_at')
        .eq('admin_user_id', user?.id)

      if (error) throw error
      setPurchases(data || [])
    } catch (error: any) {
      console.error('Error fetching purchases:', error)
    }
  }

  // Calculate purchases for each shift
  const getShiftStats = useMemo(() => {
    const statsMap = new Map<string, { count: number; total: number }>()

    shifts.forEach(shift => {
      const shiftPurchases = purchases.filter(purchase => {
        // Match by card_id and employee_id
        if (purchase.card_id !== shift.card_id || purchase.employee_id !== shift.employee_id) {
          return false
        }

        const purchaseTime = new Date(purchase.created_at)
        const startTime = new Date(shift.start_time)
        const endTime = shift.end_time ? new Date(shift.end_time) : new Date()

        // Purchase must be within shift time range
        return purchaseTime >= startTime && purchaseTime <= endTime
      })

      const total = shiftPurchases.reduce((sum, p) => sum + p.amount, 0)
      
      statsMap.set(shift.id, {
        count: shiftPurchases.length,
        total: total
      })
    })

    return statsMap
  }, [shifts, purchases])

  const handleDelete = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return

    try {
      const { error } = await supabase
        .from('card_shifts')
        .delete()
        .eq('id', shiftId)

      if (error) throw error
      
      // Remove from local state
      setShifts(shifts.filter(s => s.id !== shiftId))
      toast.success('Shift deleted successfully')
    } catch (error: any) {
      console.error('Error deleting shift:', error)
      toast.error('Failed to delete shift')
    }
  }

  const getCardDisplay = (shift: CardShift) => {
    if (shift.cards.nickname) {
      return `${shift.cards.nickname} (**** ${shift.cards.last_four})`
    }
    return `**** ${shift.cards.last_four}`
  }

  const calculateDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diffMs = end.getTime() - start.getTime()
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Card Shifts</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track card assignment history, shift durations, and spending
        </p>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Card</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Total Spending</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  Loading shifts...
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  No shifts recorded yet. Assign cards to employees to start tracking.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => {
                const stats = getShiftStats.get(shift.id) || { count: 0, total: 0 }
                
                return (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <div>{getCardDisplay(shift)}</div>
                          <div className="text-xs text-gray-500">
                            {shift.cards.bank_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{shift.employees.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(shift.start_time), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(shift.start_time), 'HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.end_time ? (
                        <>
                          <div className="text-sm">
                            {format(new Date(shift.end_time), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(shift.end_time), 'HH:mm:ss')}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {calculateDuration(shift.start_time, shift.end_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {shift.end_time ? (
                        <Badge variant="secondary">Ended</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ShoppingCart className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">
                          {stats.count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          ${stats.total.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(shift.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
