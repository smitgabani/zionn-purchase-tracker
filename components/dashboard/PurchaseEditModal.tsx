'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

interface PurchaseEditModalProps {
  purchase: Purchase | null
  isOpen: boolean
  onClose: () => void
  onSave: (purchaseId: string, orderNumber: string, initials: string) => Promise<void>
}

export function PurchaseEditModal({ purchase, isOpen, onClose, onSave }: PurchaseEditModalProps) {
  const [orderNumber, setOrderNumber] = useState('')
  const [initials, setInitials] = useState('')
  const [saving, setSaving] = useState(false)

  // Update local state when purchase changes
  useEffect(() => {
    if (purchase) {
      setOrderNumber(purchase.order_number || '')
      setInitials(purchase.reviewed_by_initials || '')
    }
  }, [purchase])

  const handleSave = async () => {
    if (!purchase) return

    setSaving(true)
    try {
      await onSave(purchase.id, orderNumber, initials)
      onClose()
    } catch (error) {
      console.error('Error saving purchase:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  if (!purchase) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Purchase Details</DialogTitle>
          <DialogDescription>
            Update order number and reviewer initials for this purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Purchase Info */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Merchant:</span>
              <span className="font-medium">{purchase.merchant || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">${purchase.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {new Date(purchase.purchase_date).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Order Number Input */}
          <div className="space-y-2">
            <Label htmlFor="order-number">Order Number</Label>
            <Input
              id="order-number"
              type="text"
              placeholder="Enter 6-digit order number"
              value={orderNumber}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOrderNumber(sanitized)
              }}
              maxLength={6}
            />
            <p className="text-xs text-gray-500">Optional, max 6 digits</p>
          </div>

          {/* Initials Input */}
          <div className="space-y-2">
            <Label htmlFor="initials">Reviewer Initials</Label>
            <Input
              id="initials"
              type="text"
              placeholder="Enter initials"
              value={initials}
              onChange={(e) => {
                const sanitized = e.target.value.toUpperCase().slice(0, 10)
                setInitials(sanitized)
              }}
              maxLength={10}
            />
            <p className="text-xs text-gray-500">Optional, max 10 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
