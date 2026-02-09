'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']
type CardType = Database['public']['Tables']['cards']['Row']

interface AlertPanelProps {
  unassignedPurchases: Purchase[]
  cards: CardType[]
}

export function AlertPanel({ unassignedPurchases, cards }: AlertPanelProps) {
  const getCardDisplay = (cardId: string | null) => {
    if (!cardId) return '-'
    const card = cards.find((c) => c.id === cardId)
    return card ? `****${card.last_four}` : 'Unknown'
  }

  if (unassignedPurchases.length === 0) {
    return (
      <Card className="p-6 border-green-200 bg-green-50">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">All Clear!</h3>
            <p className="text-sm text-green-700">
              All purchases are assigned to active shifts
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-orange-300 bg-orange-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-orange-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-orange-900">
            Purchases Without Active Shift
          </h3>
          <Badge variant="destructive" className="bg-orange-600">
            {unassignedPurchases.length}
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-orange-100 sticky top-0">
              <tr className="text-left text-xs font-medium text-orange-900">
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Card</th>
                <th className="px-6 py-3">Merchant</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-200">
              {unassignedPurchases.map((purchase) => {
                const date = new Date(purchase.purchase_date)
                const dateStr = format(date, 'MMM dd, yyyy')
                const timeStr = format(date, 'h:mm a')

                return (
                  <tr
                    key={purchase.id}
                    className="hover:bg-orange-100 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-orange-900">
                        {dateStr}
                      </div>
                      <div className="text-xs text-orange-700">{timeStr}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-orange-900 font-mono">
                      {getCardDisplay(purchase.card_id)}
                    </td>
                    <td className="px-6 py-3 text-sm text-orange-900">
                      {purchase.merchant || 'Unknown'}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-orange-900 text-right">
                      ${purchase.amount.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
