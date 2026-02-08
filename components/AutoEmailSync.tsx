'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import { toast } from 'sonner'

/**
 * Auto Email Sync Component
 * Automatically syncs Gmail emails every 15 minutes when app is open
 */
export default function AutoEmailSync() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const syncEmails = async (showToast = false) => {
    if (!user || isSyncing) return

    try {
      setIsSyncing(true)

      // Check if Gmail is connected
      const { data: syncState } = await supabase
        .from('gmail_sync_state')
        .select('*')
        .eq('admin_user_id', user.id)
        .single()

      if (!syncState || !syncState.is_connected) {
        console.log('Gmail not connected, skipping auto-sync')
        return
      }

      // Call the sync API
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const data = await response.json()
      setLastSync(new Date())

      if (showToast && data.synced > 0) {
        toast.success(`Synced ${data.synced} new email(s)`)
      }

      console.log('Auto-sync completed:', data)
    } catch (error: any) {
      console.error('Auto-sync error:', error)
      // Don't show error toast for auto-sync to avoid annoying users
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (!user) return

    // Initial sync on mount (silent)
    syncEmails(false)

    // Set up interval for every 15 minutes
    const interval = setInterval(() => {
      syncEmails(false)
    }, 15 * 60 * 1000) // 15 minutes in milliseconds

    return () => clearInterval(interval)
  }, [user])

  // Optional: Show sync indicator in development
  if (process.env.NODE_ENV === 'development' && lastSync) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
          <span>Last sync: {lastSync.toLocaleTimeString()}</span>
        </div>
      </div>
    )
  }

  return null
}
