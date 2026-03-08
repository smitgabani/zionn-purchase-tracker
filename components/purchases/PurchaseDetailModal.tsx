'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { parseUTCDate } from '@/lib/utils/date'
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

interface PurchaseDetailModalProps {
    purchase: Purchase | null
    isOpen: boolean
    onClose: () => void
    getEmployeeName: (id: string | null) => string
    getCardDisplay: (id: string | null) => string
    getCategoryName: (id: string | null) => string
    employees?: Array<{ id: string; name: string }>
    onAssignEmployee?: (purchaseId: string, employeeId: string) => void
    onEdit?: (purchase: Purchase) => void
    onDelete?: (purchaseId: string) => void
}

export function PurchaseDetailModal({
    purchase,
    isOpen,
    onClose,
    getEmployeeName,
    getCardDisplay,
    getCategoryName,
    employees,
    onAssignEmployee,
    onEdit,
    onDelete,
}: PurchaseDetailModalProps) {
    if (!purchase) return null

    const purchaseDate = parseUTCDate(purchase.purchase_date)
    const hasEmployee = !!purchase.employee_id

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Purchase Details
                        <Badge variant={purchase.source === 'email' ? 'default' : 'secondary'}>
                            {purchase.source === 'email' ? 'Auto (Email)' : 'Manual'}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Amount & Merchant */}
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                ${purchase.amount.toFixed(2)} <span className="text-sm font-normal text-gray-500">{purchase.currency}</span>
                            </p>
                            <p className="text-lg text-gray-700">{purchase.merchant || 'Unknown Merchant'}</p>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t pt-4">
                        <div>
                            <p className="text-gray-500">Date & Time</p>
                            <p className="font-medium">{format(purchaseDate, 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Card</p>
                            <p className="font-medium">{getCardDisplay(purchase.card_id)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Employee</p>
                            {hasEmployee ? (
                                <p className="font-medium">{getEmployeeName(purchase.employee_id)}</p>
                            ) : (
                                employees && onAssignEmployee ? (
                                    <Select
                                        onValueChange={(value) => onAssignEmployee(purchase.id, value)}
                                    >
                                        <SelectTrigger className="h-8 w-full mt-1">
                                            <SelectValue placeholder="Assign employee..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((employee) => (
                                                <SelectItem key={employee.id} value={employee.id}>
                                                    {employee.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="font-medium text-gray-400">N/A</p>
                                )
                            )}
                        </div>
                        <div>
                            <p className="text-gray-500">Category</p>
                            <p className="font-medium">{getCategoryName(purchase.category_id)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Order #</p>
                            <p className="font-medium">{purchase.order_number || '—'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Reviewed By</p>
                            <p className="font-medium">{purchase.reviewed_by_initials || '—'}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {purchase.description && (
                        <div className="border-t pt-3 text-sm">
                            <p className="text-gray-500">Description</p>
                            <p className="font-medium mt-1">{purchase.description}</p>
                        </div>
                    )}

                    {/* Notes */}
                    {purchase.notes && (
                        <div className="border-t pt-3 text-sm">
                            <p className="text-gray-500">Notes</p>
                            <p className="font-medium mt-1">{purchase.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    {(onEdit || onDelete) && (
                        <div className="border-t pt-3 flex gap-2">
                            {onEdit && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEdit(purchase)}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            )}
                            {onDelete && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => onDelete(purchase.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    )}

                    {/* IDs & Metadata */}
                    <div className="border-t pt-3 space-y-2 text-xs text-gray-400">
                        <div className="flex justify-between">
                            <span>Purchase ID</span>
                            <span className="font-mono">{purchase.id}</span>
                        </div>
                        {purchase.raw_email_id && (
                            <div className="flex justify-between">
                                <span>Raw Email ID</span>
                                <span className="font-mono">{purchase.raw_email_id}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Created</span>
                            <span>{format(new Date(purchase.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Updated</span>
                            <span>{format(new Date(purchase.updated_at), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
