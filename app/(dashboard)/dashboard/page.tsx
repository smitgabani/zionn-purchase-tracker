'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react'
import { OngoingShiftCard } from '@/components/dashboard/OngoingShiftCard'
import { PurchaseEditModal } from '@/components/dashboard/PurchaseEditModal'
import { AlertPanel } from '@/components/dashboard/AlertPanel'
import { toast } from 'sonner'
import { isPurchaseInShift, getShiftDayRange, isInCurrentShiftDay } from '@/lib/utils/date'
import { startOfDay } from 'date-fns'
import type { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']
type CardType = Database['public']['Tables']['cards']['Row']
type Employee = Database['public']['Tables']['employees']['Row']

interface CardShift {
  id: string
  card_id: string
  employee_id: string
  start_time: string
  end_time: string | null
  shift_id: string | null
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

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()

  const [shifts, setShifts] = useState<CardShift[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Expanded shifts tracking
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set())

  // Fetch all data
  useEffect(() => {
    if (user) {
      fetchAllData()
    }
  }, [user])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchShifts(),
        fetchPurchases(),
        fetchCards(),
        fetchEmployees(),
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchShifts = async () => {
    const todayStart = startOfDay(new Date()).toISOString()

    const { data, error } = await supabase
      .from('card_shifts')
      .select(`
        *,
        cards!inner(last_four, nickname, bank_name),
        employees(name)
      `)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching shifts:', error)
      throw error
    }

    setShifts(data || [])
  }

  const fetchPurchases = async () => {
    const todayStart = startOfDay(new Date()).toISOString()

    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .gte('purchase_date', todayStart)
      .order('purchase_date', { ascending: false })

    if (error) {
      console.error('Error fetching purchases:', error)
      throw error
    }

    setPurchases(data || [])
  }

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching cards:', error)
      throw error
    }

    setCards(data || [])
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching employees:', error)
      throw error
    }

    setEmployees(data || [])
  }

  // Computed values
  const ongoingShifts = useMemo(() => {
    return shifts.filter((s) => !s.end_time)
  }, [shifts])

  const endedShiftsToday = useMemo(() => {
    return shifts.filter((s) => s.end_time)
  }, [shifts])

  const shiftPurchases = useMemo(() => {
    const map = new Map<string, Purchase[]>()

    ongoingShifts.forEach((shift) => {
      const matches = purchases.filter((p) => {
        if (p.card_id !== shift.card_id) return false

        const purchaseTime = new Date(p.purchase_date)
        const shiftStart = new Date(shift.start_time)
        const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date()

        return purchaseTime >= shiftStart && purchaseTime <= shiftEnd
      })

      map.set(shift.id, matches)
    })

    return map
  }, [ongoingShifts, purchases])

  const unassignedPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (!p.card_id) return false // Skip manual purchases

      // Check if purchase falls within ANY shift (ongoing or ended)
      const hasMatchingShift = shifts.some((shift) => 
        isPurchaseInShift(
          { purchase_date: p.purchase_date, card_id: p.card_id as string },
          shift
        )
      )

      return !hasMatchingShift
    })
  }, [purchases, shifts])

  // Statistics
  const totalActiveSpending = useMemo(() => {
    let total = 0
    shiftPurchases.forEach((purchases) => {
      total += purchases.reduce((sum, p) => sum + p.amount, 0)
    })
    return total
  }, [shiftPurchases])

  const totalShiftSpending = useMemo(() => {
    return purchases
      .filter((purchase) => isInCurrentShiftDay(purchase.purchase_date))
      .reduce((sum, p) => sum + p.amount, 0)
  }, [purchases])

  const totalShiftsToday = useMemo(() => {
    return shifts.filter((shift) => isInCurrentShiftDay(shift.start_time)).length
  }, [shifts])

  // Handlers
  const handleToggleExpand = (shiftId: string) => {
    setExpandedShifts((prev) => {
      const next = new Set(prev)
      if (next.has(shiftId)) {
        next.delete(shiftId)
      } else {
        next.add(shiftId)
      }
      return next
    })
  }

  const handlePurchaseClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setIsModalOpen(true)
  }

  const handleSavePurchase = async (
    purchaseId: string,
    orderNumber: string,
    initials: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .update({
          order_number: orderNumber || null,
          reviewed_by_initials: initials || null,
        })
        .eq('id', purchaseId)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchaseId ? data : p))
      )

      toast.success('Purchase updated successfully')
    } catch (error: any) {
      console.error('Error updating purchase:', error)
      toast.error('Failed to update purchase')
      throw error
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Active Shifts</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {ongoingShifts.length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Total Shift Spending
              </h3>
              <p className="mt-2 text-3xl font-bold text-green-600">
                ${totalShiftSpending.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                9:00 AM - 4:30 AM cycle
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Unassigned Purchases
              </h3>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {unassignedPurchases.length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Total Shifts This Cycle
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalShiftsToday}
              </p>
            </div>
            <ShoppingCart className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Ongoing Shifts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Ongoing Shifts
            {ongoingShifts.length > 0 && (
              <Badge variant="default">{ongoingShifts.length}</Badge>
            )}
          </h2>
        </div>

        {ongoingShifts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ongoingShifts.map((shift) => (
              <OngoingShiftCard
                key={shift.id}
                shift={shift}
                purchases={shiftPurchases.get(shift.id) || []}
                isExpanded={expandedShifts.has(shift.id)}
                onToggleExpand={() => handleToggleExpand(shift.id)}
                onPurchaseClick={handlePurchaseClick}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-gray-500">
            No ongoing shifts at the moment
          </Card>
        )}
      </div>

      {/* Alert Panel */}
      <div>
        <AlertPanel unassignedPurchases={unassignedPurchases} cards={cards} />
      </div>

      {/* Purchase Edit Modal */}
      <PurchaseEditModal
        purchase={selectedPurchase}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPurchase(null)
        }}
        onSave={handleSavePurchase}
      />
    </div>
  )
}
