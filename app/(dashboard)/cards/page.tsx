'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import { setCards, addCard, updateCard, deleteCard } from '@/lib/store/slices/cardsSlice'
import { setEmployees } from '@/lib/store/slices/employeesSlice'
import { validateOrError } from '@/lib/validation/client'
import { createCardSchema, updateCardSchema } from '@/lib/validation/schemas'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database.types'

type Card = Database['public']['Tables']['cards']['Row']
type CardInsert = Database['public']['Tables']['cards']['Insert']

const UNASSIGNED_VALUE = '__unassigned__'

export default function CardsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const { cards } = useAppSelector((state) => state.cards)
  const { employees } = useAppSelector((state) => state.employees)
  const dispatch = useAppDispatch()
  const supabase = createClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  
  const [formData, setFormData] = useState({
    last_four: '',
    bank_name: '',
    card_type: '',
    nickname: '',
    employee_id: '',
    is_shared: false,
  })

  useEffect(() => {
    if (user) {
      fetchCards()
      fetchEmployees()
    }
  }, [user])

  const fetchCards = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      dispatch(setCards(data || []))
    } catch (error) {
      toast.error('Failed to load cards')
      console.error(error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      dispatch(setEmployees(data || []))
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }

  const handleOpenDialog = (card?: Card) => {
    if (card) {
      setIsEditing(true)
      setCurrentCard(card)
      setFormData({
        last_four: card.last_four,
        bank_name: card.bank_name,
        card_type: card.card_type || '',
        nickname: card.nickname || '',
        employee_id: card.employee_id || UNASSIGNED_VALUE,
        is_shared: card.is_shared,
      })
    } else {
      setIsEditing(false)
      setCurrentCard(null)
      setFormData({
        last_four: '',
        bank_name: '',
        card_type: '',
        nickname: '',
        employee_id: UNASSIGNED_VALUE,
        is_shared: false,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setCurrentCard(null)
    setFormData({
      last_four: '',
      bank_name: '',
      card_type: '',
      nickname: '',
      employee_id: UNASSIGNED_VALUE,
      is_shared: false,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      const cardData = {
        last_four: formData.last_four,
        bank_name: formData.bank_name,
        nickname: formData.nickname || null,
      }

      // Validate based on operation type
      const schema = isEditing ? updateCardSchema : createCardSchema
      const validated = validateOrError(schema, cardData, 'Invalid card data')
      if (!validated) return

      if (isEditing && currentCard) {
        // Update existing card
        const { data, error } = await supabase
          .from('cards')
          .update(validated)
          .eq('id', currentCard.id)
          .select()
          .single()

        if (error) throw error
        dispatch(updateCard(data))
        toast.success('Card updated successfully')
      } else {
        // Create new card
        const newCard = {
          admin_user_id: user.id,
          ...validated,
        }

        const { data, error } = await supabase
          .from('cards')
          .insert(newCard)
          .select()
          .single()

        if (error) throw error
        dispatch(addCard(data))
        toast.success('Card added successfully')
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save card')
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return

    try {
      // Soft delete: set deleted_at timestamp instead of permanently deleting
      const { error } = await supabase
        .from('cards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      dispatch(deleteCard(id))
      toast.success('Card deleted successfully')
    } catch (error) {
      toast.error('Failed to delete card')
      console.error(error)
    }
  }

  // Handle inline employee assignment change with shift tracking
  const handleEmployeeChange = async (cardId: string, newEmployeeId: string) => {
    try {
      const employeeId = newEmployeeId === UNASSIGNED_VALUE ? null : newEmployeeId
      const card = cards.find(c => c.id === cardId)
      
      if (!card) return

      // Step 1: End current active shift (if any)
      if (card.employee_id) {
        const { error: endShiftError } = await supabase
          .from('card_shifts')
          .update({ end_time: new Date().toISOString() })
          .eq('card_id', cardId)
          .is('end_time', null)

        if (endShiftError) {
          console.error('Error ending shift:', endShiftError)
        }
      }

      // Step 2: Update card assignment
      const { data, error } = await supabase
        .from('cards')
        .update({ employee_id: employeeId })
        .eq('id', cardId)
        .select()
        .single()

      if (error) throw error
      dispatch(updateCard(data))

      // Step 3: Create new shift (only if assigning to an employee, not unassigning)
      if (employeeId) {
        const { error: shiftError } = await supabase
          .from('card_shifts')
          .insert({
            card_id: cardId,
            employee_id: employeeId,
            start_time: new Date().toISOString(),
          })

        if (shiftError) {
          console.error('Error creating shift:', shiftError)
          toast.error('Card assigned but shift logging failed')
          return
        }
      }
      
      const employeeName = employeeId 
        ? employees.find(e => e.id === employeeId)?.name || 'Unknown'
        : 'Unassigned'
      
      toast.success(`Card assigned to ${employeeName}`)
    } catch (error) {
      toast.error('Failed to update assignment')
      console.error(error)
    }
  }

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return 'Unassigned'
    const employee = employees.find(e => e.id === employeeId)
    return employee?.name || 'Unknown'
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Responsive Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage company cards and assign them to employees
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Card' : 'Add New Card'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update card information'
                  : 'Add a new company card'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="last_four">Last 4 Digits *</Label>
                  <Input
                    id="last_four"
                    maxLength={4}
                    placeholder="1234"
                    value={formData.last_four}
                    onChange={(e) =>
                      setFormData({ ...formData, last_four: e.target.value.replace(/\D/g, '') })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    placeholder="Chase, TD, RBC, etc."
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_type">Card Type</Label>
                  <Select
                    value={formData.card_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, card_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="mastercard">Mastercard</SelectItem>
                      <SelectItem value="amex">American Express</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    id="nickname"
                    placeholder="Office Card, Travel Card, etc."
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Assign to Employee</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employee_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_shared"
                    checked={formData.is_shared}
                    onChange={(e) =>
                      setFormData({ ...formData, is_shared: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_shared" className="cursor-pointer">
                    Shared card (multiple employees can use)
                  </Label>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  {isEditing ? 'Update' : 'Add'} Card
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Responsive Table with Horizontal Scroll */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Card</TableHead>
                <TableHead className="hidden md:table-cell">Bank</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="min-w-[200px]">Assigned To</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No cards yet. Add your first card to get started.
                  </TableCell>
                </TableRow>
              ) : (
                cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate">
                            {card.nickname || `****${card.last_four}`}
                          </div>
                          {card.nickname && (
                            <div className="text-xs text-gray-500 truncate">
                              ****{card.last_four}
                            </div>
                          )}
                          {/* Show bank on mobile */}
                          <div className="text-xs text-gray-500 md:hidden truncate">
                            {card.bank_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{card.bank_name}</TableCell>
                    <TableCell className="hidden lg:table-cell capitalize">{card.card_type || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={card.employee_id || UNASSIGNED_VALUE}
                          onValueChange={(value) => handleEmployeeChange(card.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {card.is_shared && (
                          <Badge variant="outline" className="hidden sm:inline-flex">
                            Shared
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={card.is_active ? 'default' : 'secondary'}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(card)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(card.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
