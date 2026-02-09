'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Clock, Trash2, DollarSign, ShoppingCart, Plus, StopCircle, Download, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { convertToCSV, downloadCSV, formatDateForExport, formatCurrencyForExport, calculateDurationForExport } from '@/lib/utils/export'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

interface Purchase {
  id: string
  card_id: string
  employee_id: string
  amount: number
  purchase_date: string
}

interface Card {
  id: string
  last_four: string
  nickname: string | null
  bank_name: string
}

interface Employee {
  id: string
  name: string
}

export default function ShiftsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const router = useRouter()
  const supabase = createClient()
  const [shifts, setShifts] = useState<CardShift[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    card_id: '',
    employee_id: '',
    start_time_type: 'now', // 'now' or 'custom'
    custom_start_time: '',
    end_time_enabled: false,
    end_time: '',
  })

  // Filter state for ended shifts
  const [showOnlyNoId, setShowOnlyNoId] = useState(false)
  const [shiftIdSearch, setShiftIdSearch] = useState('')

  // Separate ongoing and ended shifts
  const ongoingShifts = useMemo(() =>
    shifts.filter(s => !s.end_time),
    [shifts]
  )

  const endedShifts = useMemo(() => {
    let filtered = shifts.filter(s => s.end_time)

    // Filter by "No ID" checkbox
    if (showOnlyNoId) {
      filtered = filtered.filter(s => !s.shift_id || s.shift_id.trim() === '')
    }

    // Filter by shift ID search
    if (shiftIdSearch.trim()) {
      filtered = filtered.filter(s =>
        s.shift_id && s.shift_id.toLowerCase().includes(shiftIdSearch.toLowerCase())
      )
    }

    return filtered
  }, [shifts, showOnlyNoId, shiftIdSearch])

  useEffect(() => {
    if (user) {
      fetchShifts()
      fetchPurchases()
      fetchCards()
      fetchEmployees()
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
        .select('id, card_id, employee_id, amount, purchase_date')
        .eq('admin_user_id', user?.id)

      if (error) throw error
      setPurchases(data || [])
    } catch (error: any) {
      console.error('Error fetching purchases:', error)
    }
  }

  const fetchCards = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('cards')
        .select('id, last_four, nickname, bank_name')
        .eq('admin_user_id', user.id)
        .order('last_four')

      if (error) throw error
      setCards(data || [])
    } catch (error: any) {
      console.error('Error fetching cards:', error)
    }
  }

  const fetchEmployees = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('admin_user_id', user.id)
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error fetching employees:', error)
    }
  }

  // Calculate purchases for each shift
  const getShiftStats = useMemo(() => {
    const statsMap = new Map<string, { count: number; total: number }>()

    shifts.forEach(shift => {
      const shiftPurchases = purchases.filter(purchase => {
        // Match by card_id only (employee assignment removed)
        if (purchase.card_id !== shift.card_id) {
          return false
        }

        const purchaseTime = new Date(purchase.purchase_date)
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

  const handleShiftClick = (shift: CardShift) => {
    // Build URL with query parameters for filtering
    const params = new URLSearchParams()
    params.set('cardId', shift.card_id)
    params.set('startDate', shift.start_time)
    if (shift.end_time) {
      params.set('endDate', shift.end_time)
    }

    // Navigate to purchases page with filters
    router.push(`/purchases?${params.toString()}`)
  }

  const handleEndShift = async (shift: CardShift, e: React.MouseEvent) => {
    // Stop propagation to prevent row click
    e.stopPropagation()
    
    if (!confirm('End this shift now?')) return

    try {
      const endTime = new Date().toISOString()

      const { data, error } = await supabase
        .from('card_shifts')
        .update({ end_time: endTime })
        .eq('id', shift.id)
        .select(`
          *,
          cards(last_four, nickname, bank_name),
          employees(name)
        `)
        .single()

      if (error) throw error

      // Update card to unassign employee
      const { error: cardError } = await supabase
        .from('cards')
        .update({ current_employee_id: null })
        .eq('id', shift.card_id)

      if (cardError) {
        console.error('Error updating card assignment:', cardError)
      }

      // Update local state
      setShifts(shifts.map(s => s.id === shift.id ? data : s))
      toast.success('Shift ended successfully')
    } catch (error: any) {
      console.error('Error ending shift:', error)
      toast.error('Failed to end shift')
    }
  }

  const handleOpenDialog = () => {
    setFormData({
      card_id: '',
      employee_id: '',
      start_time_type: 'now',
      custom_start_time: '',
      end_time_enabled: false,
      end_time: '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !formData.card_id || !formData.employee_id) {
      toast.error('Please select both card and employee')
      return
    }

    try {
      // Determine start time
      const startTime = formData.start_time_type === 'now' 
        ? new Date().toISOString()
        : formData.custom_start_time
          ? new Date(formData.custom_start_time).toISOString()
          : new Date().toISOString()

      // Determine end time
      const endTime = formData.end_time_enabled && formData.end_time
        ? new Date(formData.end_time).toISOString()
        : null

      // Validate: end time must be after start time
      if (endTime && new Date(endTime) <= new Date(startTime)) {
        toast.error('End time must be after start time')
        return
      }

      const shiftData = {
        card_id: formData.card_id,
        employee_id: formData.employee_id,
        start_time: startTime,
        end_time: endTime,
      }

      const { data, error } = await supabase
        .from('card_shifts')
        .insert([shiftData])
        .select(`
          *,
          cards(last_four, nickname, bank_name),
          employees(name)
        `)
        .single()

      if (error) throw error

      // If this is an active shift (no end time), update the card's current_employee_id
      if (!endTime) {
        const { error: cardError } = await supabase
          .from('cards')
          .update({ current_employee_id: formData.employee_id })
          .eq('id', formData.card_id)

        if (cardError) {
          console.error('Error updating card assignment:', cardError)
          // Don't fail the whole operation, just log the error
        }
      }

      // Add to local state
      setShifts([data, ...shifts])
      toast.success('Shift created successfully')
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('Error creating shift:', error)
      toast.error('Failed to create shift')
    }
  }

  const handleDelete = async (shiftId: string, e: React.MouseEvent) => {
    // Stop propagation to prevent row click
    e.stopPropagation()

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

  const handleShiftIdChange = async (shiftId: string, newShiftId: string) => {
    // Sanitize: max 10 characters, alphanumeric
    const sanitized = newShiftId.slice(0, 10)

    try {
      const { data, error } = await supabase
        .from('card_shifts')
        .update({ shift_id: sanitized || null })
        .eq('id', shiftId)
        .select(`
          *,
          cards(last_four, nickname, bank_name),
          employees(name)
        `)
        .single()

      if (error) throw error

      // Update local state
      setShifts(shifts.map(s => s.id === shiftId ? data : s))
    } catch (error: any) {
      console.error('Error updating shift ID:', error)
      toast.error('Failed to update shift ID')
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

  const renderShiftRow = (shift: CardShift) => {
    const stats = getShiftStats.get(shift.id) || { count: 0, total: 0 }
    
    return (
      <TableRow
        key={shift.id}
        onClick={() => handleShiftClick(shift)}
        className="cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <TableCell>
          {shift.end_time ? (
            <Input
              type="text"
              value={shift.shift_id || ''}
              onChange={(e) => handleShiftIdChange(shift.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              maxLength={10}
              placeholder="Enter ID"
              className="h-8 w-28 text-sm"
            />
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </TableCell>
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
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleEndShift(shift, e)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <StopCircle className="mr-1 h-4 w-4" />
              End Shift
            </Button>
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
            onClick={(e) => handleDelete(shift.id, e)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }


  const handleExportOngoingShifts = () => {
    if (ongoingShifts.length === 0) {
      toast.error('No ongoing shifts to export')
      return
    }
    
    const exportData = ongoingShifts.map(shift => {
      const stats = getShiftStats.get(shift.id) || { count: 0, total: 0 }
      return {
        'Card': getCardDisplay(shift),
        'Bank': shift.cards.bank_name,
        'Employee': shift.employees.name,
        'Start Time': formatDateForExport(shift.start_time),
        'End Time': 'Ongoing',
        'Duration': calculateDurationForExport(shift.start_time, shift.end_time),
        'Purchases': stats.count,
        'Total Spending': formatCurrencyForExport(stats.total)
      }
    })
    
    const csv = convertToCSV(exportData, Object.keys(exportData[0]))
    downloadCSV(csv, `ongoing-shifts-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exported ${ongoingShifts.length} ongoing shifts`)
  }

  const handleExportEndedShifts = () => {
    if (endedShifts.length === 0) {
      toast.error('No ended shifts to export')
      return
    }
    
    const exportData = endedShifts.map(shift => {
      const stats = getShiftStats.get(shift.id) || { count: 0, total: 0 }
      return {
        'Card': getCardDisplay(shift),
        'Bank': shift.cards.bank_name,
        'Employee': shift.employees.name,
        'Start Time': formatDateForExport(shift.start_time),
        'End Time': formatDateForExport(shift.end_time!),
        'Duration': calculateDurationForExport(shift.start_time, shift.end_time),
        'Purchases': stats.count,
        'Total Spending': formatCurrencyForExport(stats.total)
      }
    })
    
    const csv = convertToCSV(exportData, Object.keys(exportData[0]))
    downloadCSV(csv, `ended-shifts-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exported ${endedShifts.length} ended shifts`)
  }

  const handleExportAllShifts = () => {
    if (shifts.length === 0) {
      toast.error('No shifts to export')
      return
    }
    
    const exportData = shifts.map(shift => {
      const stats = getShiftStats.get(shift.id) || { count: 0, total: 0 }
      return {
        'Card': getCardDisplay(shift),
        'Bank': shift.cards.bank_name,
        'Employee': shift.employees.name,
        'Start Time': formatDateForExport(shift.start_time),
        'End Time': shift.end_time ? formatDateForExport(shift.end_time) : 'Ongoing',
        'Duration': calculateDurationForExport(shift.start_time, shift.end_time),
        'Status': shift.end_time ? 'Ended' : 'Active',
        'Purchases': stats.count,
        'Total Spending': formatCurrencyForExport(stats.total)
      }
    })
    
    const csv = convertToCSV(exportData, Object.keys(exportData[0]))
    downloadCSV(csv, `all-shifts-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exported ${shifts.length} shifts`)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Card Shifts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track card assignment history, shift durations, and spending. Click a shift to view purchases.
          </p>
        </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportOngoingShifts}>
                Export Ongoing Shifts ({ongoingShifts.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportEndedShifts}>
                Export Ended Shifts ({endedShifts.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAllShifts}>
                Export All Shifts ({shifts.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
              <DialogDescription>
                Manually create a card shift for an employee
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="card_id">Card *</Label>
                  <Select
                    value={formData.card_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, card_id: value })
                    }
                  >
                    <SelectTrigger id="card_id">
                      <SelectValue placeholder="Select card" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.nickname ? `${card.nickname} (` : ''}**** {card.last_four}{card.nickname ? ')' : ''} - {card.bank_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employee_id: value })
                    }
                  >
                    <SelectTrigger id="employee_id">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Select
                    value={formData.start_time_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, start_time_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Now</SelectItem>
                      <SelectItem value="custom">Custom Date & Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.start_time_type === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom_start_time">Custom Start Time</Label>
                    <Input
                      id="custom_start_time"
                      type="datetime-local"
                      value={formData.custom_start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, custom_start_time: e.target.value })
                      }
                      required={formData.start_time_type === 'custom'}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="end_time_enabled"
                    checked={formData.end_time_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time_enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="end_time_enabled" className="cursor-pointer">
                    Set end time (leave unchecked for active/ongoing shift)
                  </Label>
                </div>

                {formData.end_time_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData({ ...formData, end_time: e.target.value })
                      }
                      required={formData.end_time_enabled}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Shift</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Loading shifts...
        </div>
      ) : (
        <>
          {/* Ongoing Shifts */}
          {ongoingShifts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Badge variant="default">{ongoingShifts.length}</Badge>
                Ongoing Shifts
              </h2>
              <div className="rounded-lg border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift ID</TableHead>
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
                    {ongoingShifts.map(renderShiftRow)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Ended Shifts */}
          {endedShifts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Badge variant="secondary">{endedShifts.length}</Badge>
                  Ended Shifts
                </h2>

                {/* Filters for Ended Shifts */}
                <div className="flex items-center gap-4">
                  {/* Checkbox: Show only shifts with no ID */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show-no-id"
                      checked={showOnlyNoId}
                      onChange={(e) => setShowOnlyNoId(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    />
                    <Label
                      htmlFor="show-no-id"
                      className="text-sm font-medium cursor-pointer"
                    >
                      No ID only
                    </Label>
                  </div>

                  {/* Search by Shift ID */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by Shift ID"
                      value={shiftIdSearch}
                      onChange={(e) => setShiftIdSearch(e.target.value)}
                      className="pl-8 pr-8 w-60 h-9"
                    />
                    {shiftIdSearch && (
                      <button
                        onClick={() => setShiftIdSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift ID</TableHead>
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
                    {endedShifts.map(renderShiftRow)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {shifts.length === 0 && (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
              No shifts recorded yet. Create a shift to start tracking.
            </div>
          )}
        </>
      )}
    </div>
  )
}
