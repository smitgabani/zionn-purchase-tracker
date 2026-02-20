'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import { parseUTCDate, getShiftDayRange, isPurchaseInShift } from '@/lib/utils/date'

interface PurchaseRow {
  id: string
  amount: number
  merchant: string | null
  purchase_date: string
  card_id: string | null
}

interface CardRow {
  id: string
  last_four: string
  nickname: string | null
  bank_name: string
  card_type: string | null
}

interface ShiftRow {
  id: string
  card_id: string
  employee_id: string
  start_time: string
  end_time: string | null
  shift_id: string | null
  cards: {
    last_four: string
    nickname: string | null
    bank_name: string
  }
  employees: {
    name: string
  }
}

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'current_shift', label: 'Current Shift' },
  { value: 'previous_shift', label: 'Previous Shift' },
  { value: 'custom', label: 'Custom Range' },
]

type Period = 'daily' | 'weekly' | 'monthly'

export default function ReportsTablesPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()

  const [preset, setPreset] = useState<string>('this_month')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [cardPeriod, setCardPeriod] = useState<Period>('daily')

  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [cards, setCards] = useState<CardRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchCards()
      fetchShifts()
    }
  }, [user])

  useEffect(() => {
    if (!preset) return

    const now = new Date()

    if (preset === 'today') {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      setStartDate(start)
      setEndDate(end)
      return
    }

    if (preset === 'this_week') {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const end = new Date(now)
      setStartDate(start)
      setEndDate(end)
      return
    }

    if (preset === 'this_month') {
      const start = startOfMonth(now)
      const end = new Date(now)
      setStartDate(start)
      setEndDate(end)
      return
    }

    if (preset === 'current_shift') {
      const ongoingShift = shifts.find((shift) => !shift.end_time)
      if (ongoingShift) {
        setStartDate(parseUTCDate(ongoingShift.start_time))
        setEndDate(new Date())
        return
      }

      const { shiftStart, shiftEnd } = getShiftDayRange()
      setStartDate(shiftStart)
      setEndDate(shiftEnd)
      return
    }

    if (preset === 'previous_shift') {
      const endedShifts = shifts.filter((shift) => shift.end_time)
      const latestEnded = endedShifts.sort((a, b) => {
        const aEnd = a.end_time ? parseUTCDate(a.end_time).getTime() : 0
        const bEnd = b.end_time ? parseUTCDate(b.end_time).getTime() : 0
        return bEnd - aEnd
      })[0]

      if (latestEnded) {
        setStartDate(parseUTCDate(latestEnded.start_time))
        setEndDate(parseUTCDate(latestEnded.end_time!))
      }
    }
  }, [preset, shifts])

  useEffect(() => {
    if (user && startDate && endDate) {
      fetchPurchases()
    }
  }, [user, startDate, endDate])

  const fetchPurchases = async () => {
    if (!user || !startDate || !endDate) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id, amount, merchant, purchase_date, card_id')
        .eq('admin_user_id', user.id)
        .is('deleted_at', null)
        .gte('purchase_date', startDate.toISOString())
        .lte('purchase_date', endDate.toISOString())
        .order('purchase_date', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCards = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('cards')
        .select('id, last_four, nickname, bank_name, card_type')
        .eq('admin_user_id', user.id)
        .order('last_four')

      if (error) throw error
      setCards(data || [])
    } catch (error) {
      console.error('Error fetching cards:', error)
    }
  }

  const fetchShifts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('card_shifts')
        .select(`
          *,
          cards!inner(last_four, nickname, bank_name, admin_user_id),
          employees(name)
        `)
        .eq('cards.admin_user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(200)

      if (error) throw error
      setShifts(data || [])
    } catch (error) {
      console.error('Error fetching shifts:', error)
    }
  }

  const handleShiftSelection = (shiftId: string) => {
    setSelectedShiftId(shiftId)
    const shift = shifts.find((s) => s.id === shiftId)
    if (shift) {
      setPreset('custom')
      setStartDate(parseUTCDate(shift.start_time))
      setEndDate(shift.end_time ? parseUTCDate(shift.end_time) : new Date())
    }
  }

  const formatCardDisplay = (cardId: string | null) => {
    if (!cardId) return 'Unknown Card'
    const card = cards.find((c) => c.id === cardId)
    if (!card) return 'Unknown Card'
    const suffix = card.nickname ? ` (${card.nickname})` : ''
    return `**** ${card.last_four}${suffix}`
  }

  const groupByPeriod = (date: Date, period: Period) => {
    if (period === 'daily') {
      return format(date, 'yyyy-MM-dd')
    }
    if (period === 'weekly') {
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    }
    return format(startOfMonth(date), 'yyyy-MM')
  }

  const filteredPurchases = useMemo(() => {
    if (!startDate || !endDate) return []
    return purchases.filter((purchase) => {
      const purchaseDate = parseUTCDate(purchase.purchase_date)
      return purchaseDate >= startDate && purchaseDate <= endDate
    })
  }, [purchases, startDate, endDate])

  const shiftSummaries = useMemo(() => {
    if (!startDate || !endDate) return []

    const relevantShifts = shifts.filter((shift) => {
      const shiftStart = parseUTCDate(shift.start_time)
      const shiftEnd = shift.end_time ? parseUTCDate(shift.end_time) : new Date()
      return shiftStart <= endDate && shiftEnd >= startDate
    })

    return relevantShifts.map((shift) => {
      const purchasesForShift = filteredPurchases.filter((purchase) =>
        isPurchaseInShift(
          { purchase_date: purchase.purchase_date, card_id: purchase.card_id || '' },
          { start_time: shift.start_time, end_time: shift.end_time, card_id: shift.card_id }
        )
      )

      const total = purchasesForShift.reduce((sum, purchase) => sum + purchase.amount, 0)
      return {
        id: shift.id,
        shiftId: shift.shift_id || '—',
        card: `${shift.cards.nickname || 'Card'} (**** ${shift.cards.last_four})`,
        employee: shift.employees.name,
        start: shift.start_time,
        end: shift.end_time,
        count: purchasesForShift.length,
        total,
      }
    })
  }, [filteredPurchases, shifts, startDate, endDate])

  const merchantTotals = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>()
    filteredPurchases.forEach((purchase) => {
      const merchant = purchase.merchant?.trim() || 'Unknown Merchant'
      const current = totals.get(merchant) || { total: 0, count: 0 }
      totals.set(merchant, {
        total: current.total + purchase.amount,
        count: current.count + 1,
      })
    })

    return Array.from(totals.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [filteredPurchases])

  const cardPeriodTotals = useMemo(() => {
    const totals = new Map<string, { period: string; total: number; count: number; cardId: string | null }>()

    filteredPurchases.forEach((purchase) => {
      const date = parseUTCDate(purchase.purchase_date)
      const periodKey = groupByPeriod(date, cardPeriod)
      const cardId = purchase.card_id
      const cardLabel = formatCardDisplay(cardId)
      const key = `${periodKey}::${cardLabel}`
      const current = totals.get(key) || { period: periodKey, total: 0, count: 0, cardId }
      totals.set(key, {
        ...current,
        total: current.total + purchase.amount,
        count: current.count + 1,
      })
    })

    return Array.from(totals.values()).sort((a, b) => {
      if (a.period === b.period) return b.total - a.total
      return a.period > b.period ? -1 : 1
    })
  }, [filteredPurchases, cardPeriod])

  const cardTypeDailyTotals = useMemo(() => {
    const totals = new Map<string, { period: string; total: number; count: number; cardType: string }>()

    filteredPurchases.forEach((purchase) => {
      const date = parseUTCDate(purchase.purchase_date)
      const periodKey = groupByPeriod(date, 'daily')
      const card = cards.find((c) => c.id === purchase.card_id)
      const cardType = card?.card_type || 'Unknown'
      const key = `${periodKey}::${cardType}`
      const current = totals.get(key) || { period: periodKey, total: 0, count: 0, cardType }
      totals.set(key, {
        ...current,
        total: current.total + purchase.amount,
        count: current.count + 1,
      })
    })

    return Array.from(totals.values()).sort((a, b) => {
      if (a.period === b.period) return b.total - a.total
      return a.period > b.period ? -1 : 1
    })
  }, [filteredPurchases, cards])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Reports - Tables</h1>
        <p className="text-sm text-gray-600">
          Detailed tables for shift cycles, merchants, and card spend.
        </p>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Preset</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start</Label>
            <Input
              type="datetime-local"
              value={startDate ? format(startDate, "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(event) => {
                setPreset('custom')
                setStartDate(event.target.value ? new Date(event.target.value) : null)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>End</Label>
            <Input
              type="datetime-local"
              value={endDate ? format(endDate, "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(event) => {
                setPreset('custom')
                setEndDate(event.target.value ? new Date(event.target.value) : null)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Previous Shifts</Label>
            <Select value={selectedShiftId} onValueChange={handleShiftSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts
                  .filter((shift) => shift.end_time)
                  .map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.shift_id || 'Shift'} • {shift.employees.name} • {format(parseUTCDate(shift.start_time), 'MMM dd, HH:mm')}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="rounded-lg border bg-white p-6 text-center text-gray-500">Loading report data...</div>
      )}

      {!loading && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Purchases by Shift Cycle</h2>
              <Badge variant="secondary">{shiftSummaries.length} shifts</Badge>
            </div>
            <div className="mt-4 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift ID</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-gray-500">
                        No shifts found in this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {shiftSummaries.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>{shift.shiftId}</TableCell>
                      <TableCell>{shift.card}</TableCell>
                      <TableCell>{shift.employee}</TableCell>
                      <TableCell>{format(parseUTCDate(shift.start), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>{shift.end ? format(parseUTCDate(shift.end), 'MMM dd, HH:mm') : 'Ongoing'}</TableCell>
                      <TableCell className="text-right">{shift.count}</TableCell>
                      <TableCell className="text-right">${shift.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Merchant Spend</h2>
              <Badge variant="secondary">{merchantTotals.length} merchants</Badge>
            </div>
            <div className="mt-4 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantTotals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-gray-500">
                        No merchant data for this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {merchantTotals.map((merchant) => (
                    <TableRow key={merchant.merchant}>
                      <TableCell>{merchant.merchant}</TableCell>
                      <TableCell className="text-right">{merchant.count}</TableCell>
                      <TableCell className="text-right">${merchant.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Spend by Card</h2>
                <p className="text-xs text-gray-500">Grouped by {cardPeriod}</p>
              </div>
              <Select value={cardPeriod} onValueChange={(value) => setCardPeriod(value as Period)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardPeriodTotals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                        No card spend data for this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {cardPeriodTotals.map((row, index) => (
                    <TableRow key={`${row.period}-${index}`}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{formatCardDisplay(row.cardId)}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">${row.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Spend by Card Type (Daily)</h2>
            </div>
            <div className="mt-4 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Card Type</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardTypeDailyTotals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                        No card type data for this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {cardTypeDailyTotals.map((row, index) => (
                    <TableRow key={`${row.period}-${row.cardType}-${index}`}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.cardType}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">${row.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
