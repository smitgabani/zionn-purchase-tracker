'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Filter, X, Calendar, DollarSign, Users, CreditCard, Mail, Search, Clock } from 'lucide-react'
import { format } from 'date-fns'

export interface PurchaseFilterValues {
  startDate: Date | null
  endDate: Date | null
  minAmount: number | null
  maxAmount: number | null
  employeeIds: string[]
  cardIds: string[]
  source: 'email' | 'manual' | null
  reviewedStatus: boolean | null
  searchQuery: string
}

interface PurchaseFiltersProps {
  filters: PurchaseFilterValues
  onFilterChange: (filters: PurchaseFilterValues) => void
  employees: Array<{ id: string; name: string }>
  cards: Array<{ id: string; last_four: string }>
}

export function PurchaseFilters({ filters, onFilterChange, employees, cards }: PurchaseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = <K extends keyof PurchaseFilterValues>(
    key: K,
    value: PurchaseFilterValues[K]
  ) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const clearAllFilters = () => {
    onFilterChange({
      startDate: null,
      endDate: null,
      minAmount: null,
      maxAmount: null,
      employeeIds: [],
      cardIds: [],
      source: null,
      reviewedStatus: null,
      searchQuery: '',
    })
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.startDate) count++
    if (filters.endDate) count++
    if (filters.minAmount !== null) count++
    if (filters.maxAmount !== null) count++
    if (filters.employeeIds.length > 0) count++
    if (filters.cardIds.length > 0) count++
    if (filters.source !== null) count++
    if (filters.reviewedStatus !== null) count++
    if (filters.searchQuery) count++
    return count
  }

  const toggleEmployee = (employeeId: string) => {
    const newIds = filters.employeeIds.includes(employeeId)
      ? filters.employeeIds.filter(id => id !== employeeId)
      : [...filters.employeeIds, employeeId]
    updateFilter('employeeIds', newIds)
  }

  const toggleCard = (cardId: string) => {
    const newIds = filters.cardIds.includes(cardId)
      ? filters.cardIds.filter(id => id !== cardId)
      : [...filters.cardIds, cardId]
    updateFilter('cardIds', newIds)
  }

  // Convert Date to datetime-local string format (YYYY-MM-DDTHH:mm)
  const dateToDatetimeLocal = (date: Date | null) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Convert datetime-local string to Date
  const datetimeLocalToDate = (str: string) => {
    if (!str) return null
    return new Date(str)
  }

  const activeCount = getActiveFilterCount()

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeCount > 0 && (
            <Badge variant="default" className="ml-2">
              {activeCount} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search merchant or description..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date & Time Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date & Time Range
            </Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-600">From</Label>
                <Input
                  type="datetime-local"
                  value={dateToDatetimeLocal(filters.startDate)}
                  onChange={(e) => updateFilter('startDate', datetimeLocalToDate(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">To</Label>
                <Input
                  type="datetime-local"
                  value={dateToDatetimeLocal(filters.endDate)}
                  onChange={(e) => updateFilter('endDate', datetimeLocalToDate(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Amount Range
            </Label>
            <div className="space-y-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Min amount"
                value={filters.minAmount ?? ''}
                onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : null)}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Max amount"
                value={filters.maxAmount ?? ''}
                onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
          </div>

          {/* Employees */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </Label>
            <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500">No employees</p>
              ) : (
                employees.map(employee => (
                  <label key={employee.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.employeeIds.includes(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{employee.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cards
            </Label>
            <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
              {cards.length === 0 ? (
                <p className="text-sm text-gray-500">No cards</p>
              ) : (
                cards.map(card => (
                  <label key={card.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.cardIds.includes(card.id)}
                      onChange={() => toggleCard(card.id)}
                      className="rounded"
                    />
                    <span className="text-sm">**** {card.last_four}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Source
            </Label>
            <div className="flex gap-2">
              <Button
                variant={filters.source === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('source', null)}
                className="flex-1"
              >
                All
              </Button>
              <Button
                variant={filters.source === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('source', 'email')}
                className="flex-1"
              >
                Email
              </Button>
              <Button
                variant={filters.source === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('source', 'manual')}
                className="flex-1"
              >
                Manual
              </Button>
            </div>
          </div>

          {/* Reviewed Status */}
          <div className="space-y-2">
            <Label>Reviewed Status</Label>
            <div className="flex gap-2">
              <Button
                variant={filters.reviewedStatus === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('reviewedStatus', null)}
                className="flex-1"
              >
                All
              </Button>
              <Button
                variant={filters.reviewedStatus === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('reviewedStatus', true)}
                className="flex-1"
              >
                Yes
              </Button>
              <Button
                variant={filters.reviewedStatus === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('reviewedStatus', false)}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Badges */}
      {activeCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('searchQuery', '')}
              />
            </Badge>
          )}
          {filters.startDate && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.startDate, 'MMM dd, yyyy HH:mm')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('startDate', null)}
              />
            </Badge>
          )}
          {filters.endDate && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.endDate, 'MMM dd, yyyy HH:mm')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('endDate', null)}
              />
            </Badge>
          )}
          {filters.minAmount !== null && (
            <Badge variant="secondary" className="gap-1">
              Min: ${filters.minAmount}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('minAmount', null)}
              />
            </Badge>
          )}
          {filters.maxAmount !== null && (
            <Badge variant="secondary" className="gap-1">
              Max: ${filters.maxAmount}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('maxAmount', null)}
              />
            </Badge>
          )}
          {filters.employeeIds.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              {filters.employeeIds.length} Employee(s)
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('employeeIds', [])}
              />
            </Badge>
          )}
          {filters.cardIds.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              {filters.cardIds.length} Card(s)
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('cardIds', [])}
              />
            </Badge>
          )}
          {filters.source && (
            <Badge variant="secondary" className="gap-1">
              Source: {filters.source}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('source', null)}
              />
            </Badge>
          )}
          {filters.reviewedStatus !== null && (
            <Badge variant="secondary" className="gap-1">
              Reviewed: {filters.reviewedStatus ? 'Yes' : 'No'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('reviewedStatus', null)}
              />
            </Badge>
          )}
        </div>
      )}
    </Card>
  )
}
