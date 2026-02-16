'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Clock,
  LayoutDashboard,
  CreditCard,
  Users,
  ShoppingCart,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Cards', href: '/cards', icon: CreditCard },
  { name: 'Shifts', href: '/shifts', icon: Clock },
  { name: 'Gmail Settings', href: '/gmail-settings', icon: Settings },
]

// Hidden pages (accessible via direct URL only):
// - Emails (/emails)
// - Parsing Rules (/parsing-rules)
// - Tools (/tools)

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isDeveloperToolsOpen, setIsDeveloperToolsOpen] = useState(false)

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center justify-between border-b px-6">
        <h1 className="text-xl font-bold text-blue-600">PurchaseTracker</h1>
        {/* Close button for mobile */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
              onClick={onClose} // Close sidebar on mobile when clicking a link
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer - Developer Tools (Collapsible) */}
      <div className="border-t px-3 py-3">
        <button
          onClick={() => setIsDeveloperToolsOpen(!isDeveloperToolsOpen)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span>Developer Tools</span>
          {isDeveloperToolsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isDeveloperToolsOpen && (
          <div className="space-y-1 mt-2">
            <Link
              href="/emails"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                pathname === '/emails'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
              onClick={onClose}
            >
              Emails
            </Link>
            <Link
              href="/parsing-rules"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                pathname === '/parsing-rules'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
              onClick={onClose}
            >
              Parsing Rules
            </Link>
            <Link
              href="/tools"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                pathname === '/tools'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
              onClick={onClose}
            >
              Tools
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
