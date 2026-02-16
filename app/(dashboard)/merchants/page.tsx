'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import { setMerchants, addMerchant, updateMerchant, deleteMerchant } from '@/lib/store/slices/merchantsSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database.types'
import { Badge } from '@/components/ui/badge'

type Merchant = Database['public']['Tables']['merchants']['Row']
type Purchase = Database['public']['Tables']['purchases']['Row']

export default function MerchantsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const { merchants } = useAppSelector((state) => state.merchants)
  const dispatch = useAppDispatch()
  const supabase = createClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [uniquePurchaseMerchants, setUniquePurchaseMerchants] = useState<string[]>([])
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set())
  const [isImporting, setIsImporting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    notes: '',
  })

  // Fetch merchants on mount
  useEffect(() => {
    fetchMerchants()
  }, [user])

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
      toast.error('Failed to fetch merchants')
    }
  }

  const fetchUniquePurchaseMerchants = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('merchant')
        .eq('admin_user_id', user.id)
        .is('deleted_at', null)
        .not('merchant', 'is', null)

      if (error) throw error

      // Get unique merchant names
      const uniqueNames = [...new Set(data.map(p => p.merchant).filter(Boolean))] as string[]
      
      // Filter out merchants that already exist
      const existingMerchantNames = new Set(merchants.map(m => m.name.toLowerCase()))
      const newMerchants = uniqueNames.filter(name => 
        !existingMerchantNames.has(name.toLowerCase())
      )

      setUniquePurchaseMerchants(newMerchants.sort())
    } catch (error: any) {
      console.error('Error fetching purchase merchants:', error)
      toast.error('Failed to fetch merchants from purchases')
    }
  }

  const handleOpenImportDialog = () => {
    fetchUniquePurchaseMerchants()
    setSelectedMerchants(new Set())
    setIsImportDialogOpen(true)
  }

  const handleToggleMerchant = (merchantName: string) => {
    const newSelected = new Set(selectedMerchants)
    if (newSelected.has(merchantName)) {
      newSelected.delete(merchantName)
    } else {
      newSelected.add(merchantName)
    }
    setSelectedMerchants(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedMerchants.size === uniquePurchaseMerchants.length) {
      setSelectedMerchants(new Set())
    } else {
      setSelectedMerchants(new Set(uniquePurchaseMerchants))
    }
  }

  const handleImportSelected = async () => {
    if (selectedMerchants.size === 0) {
      toast.error('Please select at least one merchant to import')
      return
    }

    setIsImporting(true)
    try {
      const merchantsToInsert = Array.from(selectedMerchants).map(name => ({
        admin_user_id: user!.id,
        name: name,
        notes: null,
      }))

      const { data, error } = await supabase
        .from('merchants')
        .insert(merchantsToInsert)
        .select()

      if (error) throw error

      data.forEach(merchant => dispatch(addMerchant(merchant)))
      toast.success(`Successfully imported ${data.length} merchant(s)`)
      setIsImportDialogOpen(false)
      setSelectedMerchants(new Set())
    } catch (error: any) {
      console.error('Error importing merchants:', error)
      toast.error('Failed to import merchants')
    } finally {
      setIsImporting(false)
    }
  }

  const handleOpenDialog = (merchant?: Merchant) => {
    if (merchant) {
      setIsEditing(true)
      setCurrentMerchant(merchant)
      setFormData({
        name: merchant.name || '',
        notes: merchant.notes || '',
      })
    } else {
      setIsEditing(false)
      setCurrentMerchant(null)
      setFormData({
        name: '',
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setCurrentMerchant(null)
    setFormData({
      name: '',
      notes: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return
    if (!formData.name.trim()) {
      toast.error('Merchant name is required')
      return
    }

    try {
      if (isEditing && currentMerchant) {
        // Update existing merchant
        const { data, error } = await supabase
          .from('merchants')
          .update({
            name: formData.name,
            notes: formData.notes,
          })
          .eq('id', currentMerchant.id)
          .select()
          .single()

        if (error) throw error
        dispatch(updateMerchant(data))
        toast.success('Merchant updated successfully')
      } else {
        // Create new merchant
        const { data, error } = await supabase
          .from('merchants')
          .insert({
            admin_user_id: user.id,
            name: formData.name,
            notes: formData.notes,
          })
          .select()
          .single()

        if (error) throw error
        dispatch(addMerchant(data))
        toast.success('Merchant created successfully')
      }

      handleCloseDialog()
    } catch (error: any) {
      console.error('Error saving merchant:', error)
      toast.error('Failed to save merchant')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this merchant?')) return

    try {
      const { error } = await supabase
        .from('merchants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      dispatch(deleteMerchant(id))
      toast.success('Merchant deleted successfully')
    } catch (error: any) {
      console.error('Error deleting merchant:', error)
      toast.error('Failed to delete merchant')
    }
  }

  // Filter merchants based on search query
  const filteredMerchants = merchants.filter(merchant =>
    merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your merchant list
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenImportDialog}>
            <Upload className="mr-2 h-4 w-4" />
            Import from Purchases
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Merchant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? 'Edit Merchant' : 'Add New Merchant'}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? 'Update the merchant information below.'
                      : 'Enter the merchant information below.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Merchant Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Amazon, Walmart"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditing ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Merchants from Purchases</DialogTitle>
            <DialogDescription>
              Select merchant names from your purchases to add to your merchant list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {uniquePurchaseMerchants.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No new merchants found in purchases
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    Found {uniquePurchaseMerchants.length} unique merchant(s)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedMerchants.size === uniquePurchaseMerchants.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {uniquePurchaseMerchants.map((merchantName) => (
                      <div
                        key={merchantName}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleToggleMerchant(merchantName)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMerchants.has(merchantName)}
                          onChange={() => handleToggleMerchant(merchantName)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="flex-1">{merchantName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSelected}
              disabled={selectedMerchants.size === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${selectedMerchants.size} Merchant(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search merchants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Merchants Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMerchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No merchants found
                </TableCell>
              </TableRow>
            ) : (
              filteredMerchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">{merchant.name}</TableCell>
                  <TableCell className="text-gray-600">
                    {merchant.notes || '-'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(merchant.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(merchant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(merchant.id)}
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
    </div>
  )
}
