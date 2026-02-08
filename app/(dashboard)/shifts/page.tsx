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
import { Clock, Trash2, DollarSign, ShoppingCart, Plus } from 'lucide-react'
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
        .select('id, card_id, employee_id, amount, created_at')
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

      // Add to local state
      setShifts([data, ...shifts])
      toast.success('Shift created successfully')
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('Error creating shift:', error)
      toast.error('Failed to create shift')
    }
  }

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
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Card Shifts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track card assignment history, shift durations, and spending
          </p>
        </div>
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
                  No shifts recorded yet. Create a shift to start tracking.
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
