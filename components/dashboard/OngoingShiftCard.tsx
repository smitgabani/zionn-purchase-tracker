'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, DollarSign, ShoppingCart, ChevronDown, ChevronUp, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

interface CardShift {
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

interface OngoingShiftCardProps {
  shift: CardShift
  purchases: Purchase[]
  isExpanded: boolean
  onToggleExpand: () => void
  onPurchaseClick: (purchase: Purchase) => void
}

export function OngoingShiftCard({
  shift,
  purchases,
  isExpanded,
  onToggleExpand,
  onPurchaseClick,
}: OngoingShiftCardProps) {
  const totalSpending = purchases.reduce((sum, p) => sum + p.amount, 0)
  const displayedPurchases = isExpanded ? purchases : purchases.slice(0, 5)
  const hasMore = purchases.length > 5

  const cardDisplay = shift.cards.nickname
    ? `${shift.cards.nickname} (****${shift.cards.last_four})`
    : `****${shift.cards.last_four}`

  const timeAgo = formatDistanceToNow(new Date(shift.start_time), { addSuffix: true })

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{shift.employees.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-3.5 w-3.5" />
          <span>{cardDisplay}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">Started {timeAgo}</div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b">
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShoppingCart className="h-3 w-3" />
          {purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'}
        </Badge>
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <DollarSign className="h-3 w-3" />
          ${totalSpending.toFixed(2)}
        </Badge>
      </div>

      {/* Purchase List */}
      {purchases.length > 0 ? (
        <div className="space-y-1">
          {displayedPurchases.map((purchase) => {
            const time = new Date(purchase.purchase_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <button
                key={purchase.id}
                onClick={() => onPurchaseClick(purchase)}
                className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                    {time}
                  </span>
                  <span className="text-sm text-gray-700 truncate">
                    {purchase.merchant || 'Unknown'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">
                  ${purchase.amount.toFixed(2)}
                </span>
              </button>
            )
          })}

          {/* Expand/Collapse Button */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="w-full mt-2 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show all {purchases.length} purchases
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-500">
          No purchases yet
        </div>
      )}
    </Card>
  )
}
