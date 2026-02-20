'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import {
  setPurchases,
  appendPurchases,
  resetPurchases,
  addPurchase,
  updatePurchase,
  deletePurchase,
  setLoadingMore,
  setHasMore,
  setPage
} from '@/lib/store/slices/purchasesSlice'
import { setEmployees } from '@/lib/store/slices/employeesSlice'
import { setCards } from '@/lib/store/slices/cardsSlice'
import { setMerchants } from '@/lib/store/slices/merchantsSlice'
import { setCategories } from '@/lib/store/slices/categoriesSlice'
import { logger } from '@/lib/logger'
import { validateOrError } from '@/lib/validation/client'
import { createPurchaseSchema, updatePurchaseSchema } from '@/lib/validation/schemas'
import { handleError } from '@/lib/error-handler'
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
import { Plus, Pencil, Trash2, Check, X, CheckSquare, UserPlus, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database.types'
import { format } from 'date-fns'
import { PurchaseFilters, type PurchaseFilterValues } from '@/components/purchases/PurchaseFilters'
import { convertToCSV, downloadCSV, formatDateForExport, formatCurrencyForExport } from '@/lib/utils/export'
import { parseUTCDate } from '@/lib/utils/date'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Purchase = Database['public']['Tables']['purchases']['Row']
type PurchaseInsert = Database['public']['Tables']['purchases']['Insert']

const PURCHASES_PER_PAGE = 100

export default function PurchasesPage() {
  const { user } = useAppSelector((state) => state.auth)
  const { purchases, currentPage, hasMore, isLoadingMore } = useAppSelector((state) => state.purchases)
  const { employees } = useAppSelector((state) => state.employees)
  const { cards } = useAppSelector((state) => state.cards)
  const { merchants } = useAppSelector((state) => state.merchants)
  const { categories } = useAppSelector((state) => state.categories)
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null)

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set())
  const [autoSelectFromShift, setAutoSelectFromShift] = useState(false)

  // Bulk assign employee dialog
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkAssignEmployeeId, setBulkAssignEmployeeId] = useState('')

  const [formData, setFormData] = useState({
    purchase_date: '',
    merchant: '',
    amount: '',
    employee_id: '',
    card_id: '',
    category_id: '',
    description: '',
    order_number: '',
  })
  // Filter state
  const [filters, setFilters] = useState<PurchaseFilterValues>({
    startDate: null,
    endDate: null,
    minAmount: null,
    maxAmount: null,
    cardIds: [],
    source: null,
    reviewedStatus: null,
    searchQuery: '',
    verifiedMerchants: [],
  // Apply client-side filtering (safety net in addition to server-side filtering)
  })
  const [filtersReady, setFiltersReady] = useState(false)
  const filteredPurchases = useMemo(() => {
    let result = purchases

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter(p => 
        p.merchant?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }

    // Date range filters
    if (filters.startDate) {
      result = result.filter(p => parseUTCDate(p.purchase_date) >= filters.startDate!)
    }
    if (filters.endDate) {
      result = result.filter(p => parseUTCDate(p.purchase_date) <= filters.endDate!)
    }

    // Amount range filters
    if (filters.minAmount !== null) {
      result = result.filter(p => p.amount >= filters.minAmount!)
    }
    if (filters.maxAmount !== null) {
      result = result.filter(p => p.amount <= filters.maxAmount!)
    }

    // Card filter
    if (filters.cardIds.length > 0) {
      result = result.filter(p => p.card_id && filters.cardIds.includes(p.card_id))
    }

    // Source filter
    if (filters.source === 'email') {
      result = result.filter(p => p.raw_email_id !== null)
    } else if (filters.source === 'manual') {
      result = result.filter(p => p.raw_email_id === null)
    }

    // Reviewed status filter
    if (filters.reviewedStatus !== null) {
      if (filters.reviewedStatus) {
        result = result.filter(p => p.reviewed_by_initials && p.reviewed_by_initials !== '')
      } else {
        result = result.filter(p => !p.reviewed_by_initials || p.reviewed_by_initials === '')
      }
    }

    return result
  }, [purchases, filters])

  // Calculate if there are more purchases to load (server-side pagination)
  const serverHasMore = useMemo(() => {
    return hasMore
  }, [hasMore])

  // Override hasMore if client-side filtering reduces results
  const effectiveHasMore = useMemo(() => {
    // If client-side filtering shows fewer results than server provided,
    // but we've loaded all server data, there's no more to load
    if (filteredPurchases.length === 0 && purchases.length > 0) {
      return false  // Client filters eliminated all results
    }
    return serverHasMore
  }, [filteredPurchases.length, purchases.length, serverHasMore])

  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    const selected = filteredPurchases.filter(p => selectedPurchases.has(p.id))
    const total = selected.reduce((sum, p) => sum + p.amount, 0)
    return {
      count: selected.length,
      total: total
    }
  }, [filteredPurchases, selectedPurchases])

  // Debug: log filter results after useMemo completes
  logger.log("📊 Total purchases:", purchases.length, "Filtered:", filteredPurchases.length, "Active filters:", Object.values(filters).filter(v => v !== null && (Array.isArray(v) ? v.length > 0 : v !== "")).length)

  // Fetch initial data on mount
  useEffect(() => {
    fetchEmployees()
    fetchCards()
    fetchCategories()
    fetchMerchants()
  }, [user])

  // Fetch purchases when user or filters change
  useEffect(() => {
    if (user && filtersReady) {
      dispatch(resetPurchases())
      fetchPurchases(0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters, filtersReady])
  // Read URL parameters and apply filters from shift navigation
  useEffect(() => {
    const cardId = searchParams.get('cardId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (cardId || startDate || endDate) {
      // Enable selection mode
      setSelectionMode(true)

      // Set flag to auto-select after filters apply
      setAutoSelectFromShift(true)

      setFilters(prev => ({
        ...prev,
        cardIds: cardId ? [cardId] : [],
        startDate: startDate ? parseUTCDate(startDate) : null,
        endDate: endDate ? parseUTCDate(endDate) : null,
      }))
    }

    setFiltersReady(true)
  }, [searchParams])

  // Auto-select all filtered purchases when coming from shift
  useEffect(() => {
    if (autoSelectFromShift && filteredPurchases.length > 0) {
      setSelectedPurchases(new Set(filteredPurchases.map(p => p.id)))
      setAutoSelectFromShift(false) // Only run once
    }
  }, [autoSelectFromShift, filteredPurchases])

  // Fetch purchases with server-side filtering and pagination
  const fetchPurchases = useCallback(async (page = 0, append = false) => {
    logger.log("🔍 Fetching purchases for user:", user?.id, "page:", page)
    if (!user) return

    try {
      if (append) {
        dispatch(setLoadingMore(true))
      }

      // Build base query
      let query = supabase
        .from('purchases')
        .select('*', { count: 'exact' })
        .eq('admin_user_id', user.id)
        .is('deleted_at', null)

      // Apply search query filter
      if (filters.searchQuery) {
        query = query.or(`merchant.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`)
      }

      // Apply date range filters
      if (filters.startDate) {
        query = query.gte('purchase_date', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        query = query.lte('purchase_date', filters.endDate.toISOString())
      }

      // Apply amount range filters
      if (filters.minAmount !== null) {
        query = query.gte('amount', filters.minAmount)
      }
      if (filters.maxAmount !== null) {
        query = query.lte('amount', filters.maxAmount)
      }

      // Apply card filter
      if (filters.cardIds.length > 0) {
        query = query.in('card_id', filters.cardIds)
      }

      // Apply source filter
      if (filters.source === 'email') {
        query = query.not('raw_email_id', 'is', null)
      } else if (filters.source === 'manual') {
        query = query.is('raw_email_id', null)
      }

      // Apply verified merchants filter
      if (filters.verifiedMerchants.length > 0) {
        const merchantFilters = filters.verifiedMerchants
          .map(name => `merchant.ilike.${name.replace(/%/g, '\%')}`)
          .join(',')
        query = query.or(merchantFilters)
      }

      // Apply reviewed status filter
      if (filters.reviewedStatus !== null) {
        if (filters.reviewedStatus) {
          query = query.not('reviewed_by_initials', 'is', null).neq('reviewed_by_initials', '')
        } else {
          query = query.or('reviewed_by_initials.is.null,reviewed_by_initials.eq.')
        }
      }

      // Apply pagination and ordering
      const start = page * PURCHASES_PER_PAGE
      const end = start + PURCHASES_PER_PAGE - 1
      query = query
        .order('purchase_date', { ascending: false })
        .range(start, end)

      const { data, error, count } = await query

      logger.log("📦 Purchases fetched:", data?.length, "items, page:", page, "total count:", count)
      if (error) {
        // PostgREST returns 416 when range is outside result set
        if (error.status === 416) {
          dispatch(setHasMore(false))
          if (append) {
            dispatch(setLoadingMore(false))
          }
          return
        }
        throw error
      }

      const rows = data || []
      if (append) {
        dispatch(appendPurchases(rows))
      } else {
        dispatch(setPurchases(rows))
      }

      // Update pagination state
      const hasMoreData = count !== null && count !== undefined
        ? (page + 1) * PURCHASES_PER_PAGE < count
        : rows.length === PURCHASES_PER_PAGE
      dispatch(setHasMore(hasMoreData))

      // If we got fewer rows than requested, stop paging
      if (rows.length < PURCHASES_PER_PAGE) {
        dispatch(setHasMore(false))
      }

      // Clear loading state after successful fetch
      if (append) {
        dispatch(setLoadingMore(false))
      }

    } catch (error: any) {
      console.error('Error fetching purchases:', error)
      toast.error('Failed to load purchases')
      dispatch(setLoadingMore(false))
    }

    // Ensure loading state cleared
    if (append) {
      dispatch(setLoadingMore(false))
    }
  }, [user, filters, dispatch, supabase])

  const fetchEmployees = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('name')

      if (error) throw error
      dispatch(setEmployees(data || []))
    } catch (error: any) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchCards = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('last_four')

      if (error) throw error
      dispatch(setCards(data || []))
    } catch (error: any) {
      console.error('Error fetching cards:', error)
    }
  }

  const fetchMerchants = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('admin_user_id', user.id)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      dispatch(setMerchants(data || []))
    } catch (error: any) {
      console.error('Error fetching merchants:', error)
    }
  }

  const fetchCategories = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('name')

      if (error) throw error
      dispatch(setCategories(data || []))
    } catch (error: any) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleOpenDialog = (purchase?: Purchase) => {
    if (purchase) {
      setIsEditing(true)
      setCurrentPurchase(purchase)
      setFormData({
        purchase_date: purchase.purchase_date || '',
        merchant: purchase.merchant || '',
        amount: purchase.amount.toString(),
        employee_id: purchase.employee_id || '',
        card_id: purchase.card_id || '',
        category_id: purchase.category_id || '',
        description: purchase.description || '',
        order_number: purchase.order_number || '',
      })
    } else {
      setIsEditing(false)
      setCurrentPurchase(null)
      setFormData({
        purchase_date: '',
        merchant: '',
        amount: '',
        employee_id: '',
        card_id: '',
        category_id: '',
        description: '',
        order_number: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      // Prepare purchase data
      const purchaseData: any = {
        admin_user_id: user.id,
        purchase_date: formData.purchase_date || new Date().toISOString().split('T')[0],
        merchant: formData.merchant,
        amount: parseFloat(formData.amount),
        employee_id: formData.employee_id || null,
        card_id: formData.card_id || null,
        category_id: formData.category_id || null,
        description: formData.description || null,
        order_number: formData.order_number || null,
        source: 'manual',
      }

      // Validate based on operation type
      const schema = isEditing ? updatePurchaseSchema : createPurchaseSchema
      const validated = validateOrError(schema, purchaseData, 'Invalid purchase data')

      if (!validated) return // Validation failed, error toast already shown

      if (isEditing && currentPurchase) {
        const { data, error } = await supabase
          .from('purchases')
          .update(validated)
          .eq('id', currentPurchase.id)
          .select()
          .single()

        if (error) throw error
        dispatch(updatePurchase(data))
        toast.success('Purchase updated successfully')
      } else {
        const { data, error } = await supabase
          .from('purchases')
          .insert([validated])
          .select()
          .single()

        if (error) throw error
        dispatch(addPurchase(data))
        toast.success('Purchase added successfully')
      }

      setIsDialogOpen(false)
    } catch (error) {
      handleError(error, 'Failed to save purchase')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return

    try {
      // Soft delete: set deleted_at timestamp instead of permanently deleting
      const { error } = await supabase
        .from('purchases')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      dispatch(deletePurchase(id))
      toast.success('Purchase deleted successfully')
    } catch (error) {
      handleError(error, 'Failed to delete purchase')
    }
  }

  // Bulk operations - removed bulk mark as reviewed since we're using initials now

  const handleBulkAssignEmployee = async () => {
    if (!bulkAssignEmployeeId || selectedPurchases.size === 0) {
      toast.error('Please select an employee')
      return
    }

    try {
      const selectedIds = Array.from(selectedPurchases)

      const { data, error } = await supabase
        .from('purchases')
        .update({ employee_id: bulkAssignEmployeeId })
        .in('id', selectedIds)
        .select()

      if (error) throw error

      // Update Redux store
      data.forEach(purchase => {
        dispatch(updatePurchase(purchase))
      })

      const employeeName = employees.find(e => e.id === bulkAssignEmployeeId)?.name || 'employee'
      toast.success(`Assigned ${selectedIds.length} purchase${selectedIds.length === 1 ? '' : 's'} to ${employeeName}`)

      setBulkAssignDialogOpen(false)
      setBulkAssignEmployeeId('')
      setSelectedPurchases(new Set()) // Clear selection
    } catch (error: any) {
      console.error('Error bulk assigning employee:', error)
      toast.error('Failed to assign employee')
    }
  }

  const handleOrderNumberChange = async (purchaseId: string, orderNumber: string) => {
    // Only allow digits and limit to 6 characters
    const sanitized = orderNumber.replace(/\D/g, '').slice(0, 6)

    try {
      const { data, error } = await supabase
        .from('purchases')
        .update({ order_number: sanitized || null })
        .eq('id', purchaseId)
        .select()
        .single()

      if (error) throw error

      // Update Redux store
      dispatch(updatePurchase(data))
    } catch (error: any) {
      console.error('Error updating order number:', error)
      toast.error('Failed to update order number')
    }
  }

  const handleInitialsChange = async (purchaseId: string, initials: string) => {
    // Convert to uppercase and limit to 10 characters
    const sanitized = initials.toUpperCase().slice(0, 10)

    try {
      const { data, error } = await supabase
        .from('purchases')
        .update({ reviewed_by_initials: sanitized || null })
        .eq('id', purchaseId)
        .select()
        .single()

      if (error) throw error

      // Update Redux store
      dispatch(updatePurchase(data))
    } catch (error: any) {
      console.error('Error updating initials:', error)
      toast.error('Failed to update initials')
    }
  }

  // Selection mode functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedPurchases(new Set())
    }
  }

  const togglePurchaseSelection = (purchaseId: string) => {
    const newSelected = new Set(selectedPurchases)
    if (newSelected.has(purchaseId)) {
      newSelected.delete(purchaseId)
    } else {
      newSelected.add(purchaseId)
    }
    setSelectedPurchases(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedPurchases.size === filteredPurchases.length) {
      // Deselect all
      setSelectedPurchases(new Set())
    } else {
      // Select all filtered
      setSelectedPurchases(new Set(filteredPurchases.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedPurchases(new Set())
  }

  const handleExportSelected = () => {
    if (selectedPurchases.size === 0) {
      toast.error('No purchases selected')
      return
    }
    
    const selected = filteredPurchases.filter(p => selectedPurchases.has(p.id))
    const exportData = selected.map(purchase => ({
      'Date': formatDateForExport(purchase.purchase_date),
      'Merchant': purchase.merchant || '',
      'Amount': formatCurrencyForExport(purchase.amount),
      'Employee': getEmployeeName(purchase.employee_id),
      'Card': getCardDisplay(purchase.card_id),
      'Category': categories.find(c => c.id === purchase.category_id)?.name || 'N/A',
      'Source': purchase.raw_email_id ? 'Email' : 'Manual',
      'Reviewed By': purchase.reviewed_by_initials || '',
      'Description': purchase.description || ''
    }))
    
    const csv = convertToCSV(exportData, Object.keys(exportData[0]))
    downloadCSV(csv, `selected-purchases-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exported ${selected.length} selected purchases`)
  }

  const handleExportFiltered = () => {
    if (filteredPurchases.length === 0) {
      toast.error('No purchases to export')
      return
    }
    
    const exportData = filteredPurchases.map(purchase => ({
      'Date': formatDateForExport(purchase.purchase_date),
      'Merchant': purchase.merchant || '',
      'Amount': formatCurrencyForExport(purchase.amount),
      'Employee': getEmployeeName(purchase.employee_id),
      'Card': getCardDisplay(purchase.card_id),
      'Category': categories.find(c => c.id === purchase.category_id)?.name || 'N/A',
      'Source': purchase.raw_email_id ? 'Email' : 'Manual',
      'Reviewed By': purchase.reviewed_by_initials || '',
      'Description': purchase.description || ''
    }))
    
    const csv = convertToCSV(exportData, Object.keys(exportData[0]))
    downloadCSV(csv, `filtered-purchases-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exported ${filteredPurchases.length} purchases`)
  }

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0) return
    dispatch(setPage(nextPage))
    fetchPurchases(nextPage, false)
  }

  const handleNextPage = () => {
    if (effectiveHasMore && !isLoadingMore) {
      handlePageChange(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 0 && !isLoadingMore) {
      handlePageChange(currentPage - 1)
    }
  }


  const handleExportAll = () => {
    if (purchases.length === 0) {
      toast.error('No purchases to export')
      return
    }
    
    const exportData = purchases.map(purchase => ({
      'Date': formatDateForExport(purchase.purchase_date),
      'Merchant': purchase.merchant || '',
      'Amount': formatCurrencyForExport(purchase.amount),
      'Employee': getEmployeeName(purchase.employee_id),
      'Card': getCardDisplay(purchase.card_id),
      'Category': categories.find(c => c.id === purchase.category_id)?.name || 'N/A',
      'Source': purchase.raw_email_id ? 'Email' : 'Manual',
      'Reviewed By': purchase.reviewed_by_initials || '',
      'Description': purchase.description || ''
    }))
    
    const csv = convertToCSV(exportData, Object.keys(exportData[0]))
    downloadCSV(csv, `all-purchases-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exported ${purchases.length} purchases`)
  }

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return 'N/A'
    return employees.find(e => e.id === employeeId)?.name || 'Unknown'
  }

  const getCardDisplay = (cardId: string | null) => {
    if (!cardId) return 'N/A'
    const card = cards.find(c => c.id === cardId)
    return card ? `**** ${card.last_four}` : 'Unknown'
  }

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#6366f1'
    return categories.find(c => c.id === categoryId)?.color || '#6366f1'
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage all purchase transactions
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant={selectionMode ? "outline" : "secondary"}
            onClick={toggleSelectionMode}
            className="flex-1 sm:flex-none"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            {selectionMode ? 'Cancel Selection' : 'Operations'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {selectionMode && selectedPurchases.size > 0 && (
                <DropdownMenuItem onClick={handleExportSelected}>
                  Export Selected ({selectedPurchases.size})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExportFiltered}>
                Export Filtered ({filteredPurchases.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAll}>
                Export All ({purchases.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                Add Purchase
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Edit Purchase' : 'Add Manual Purchase'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? 'Update purchase details'
                    : 'Manually add a purchase transaction'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (CAD) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merchant">Merchant *</Label>
                    <Input
                      id="merchant"
                      placeholder="Enter merchant name"
                      value={formData.merchant}
                      onChange={(e) =>
                        setFormData({ ...formData, merchant: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_date">Purchase Date</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) =>
                        setFormData({ ...formData, purchase_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employee_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card_id">Card</Label>
                    <Select
                      value={formData.card_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, card_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select card" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {cards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            **** {card.last_four}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order_number">Order Number</Label>
                    <Input
                      id="order_number"
                      type="text"
                      maxLength={6}
                      placeholder="6-digit order #"
                      value={formData.order_number}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setFormData({ ...formData, order_number: sanitized })
                      }}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Optional description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {isEditing ? 'Update' : 'Add'} Purchase
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mb-6">
        <PurchaseFilters
          filters={filters}
          onFilterChange={setFilters}
          cards={cards}
          merchants={merchants}
        />
      </div>

      {/* Selection Summary with Bulk Actions */}
      {selectionMode && selectedPurchases.size > 0 && (
        <div className="mb-4 rounded-lg border bg-blue-50 border-blue-200 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-blue-900">
                  {selectionSummary.count} {selectionSummary.count === 1 ? 'purchase' : 'purchases'} selected
                </span>
                <span className="text-blue-700">
                  Total: ${selectionSummary.total.toFixed(2)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="w-full sm:w-auto"
              >
                Clear Selection
              </Button>
            </div>
            
            {/* Bulk Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign to Employee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign to Employee</DialogTitle>
                    <DialogDescription>
                      Assign {selectionSummary.count} selected purchase{selectionSummary.count === 1 ? '' : 's'} to an employee
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-employee">Select Employee</Label>
                      <Select
                        value={bulkAssignEmployeeId}
                        onValueChange={setBulkAssignEmployeeId}
                      >
                        <SelectTrigger id="bulk-employee">
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBulkAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAssignEmployee}>
                      Assign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      )}

      {/* Purchases Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionMode && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={filteredPurchases.length > 0 && selectedPurchases.size === filteredPurchases.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
              )}
              <TableHead>Date & Time</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Initials</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectionMode ? 8 : 7} className="text-center text-gray-500">
                  {purchases.length === 0 ? 'No purchases found' : 'No purchases match your filters'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  {selectionMode && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedPurchases.has(purchase.id)}
                        onChange={() => togglePurchaseSelection(purchase.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {format(parseUTCDate(purchase.purchase_date), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{purchase.merchant}</div>
                      {purchase.description && (
                        <div className="text-xs text-gray-500">
                          {purchase.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${purchase.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{getCardDisplay(purchase.card_id)}</TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="------"
                      value={purchase.order_number || ''}
                      onChange={(e) => handleOrderNumberChange(purchase.id, e.target.value)}
                      className="w-24 h-8 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      maxLength={10}
                      placeholder="---"
                      value={purchase.reviewed_by_initials || ''}
                      onChange={(e) => handleInitialsChange(purchase.id, e.target.value)}
                      className="w-20 h-8 text-center uppercase"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(purchase)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(purchase.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


      {/* Pagination Controls */}
      <div className="flex items-center justify-between py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevPage}
          disabled={currentPage === 0 || isLoadingMore}
        >
          Previous
        </Button>
        <div className="text-sm text-gray-600">
          Page {currentPage + 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={!effectiveHasMore || isLoadingMore}
        >
          Next
        </Button>
      </div>

      {/* Loading indicator */}
      {isLoadingMore && effectiveHasMore && (
        <div className="flex justify-center py-4">
          <div className="text-sm text-gray-600">Loading more purchases...</div>
        </div>
      )}

      {/* Total Purchases Counter */}
      <div className="mt-4 p-4 border-t bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Showing {filteredPurchases.length} purchases
            {!hasMore && filteredPurchases.length > 0 && " (all loaded)"}
          </span>
          {filteredPurchases.length > 0 && (
            <span className="text-gray-600">
              Total Amount: ${filteredPurchases.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
