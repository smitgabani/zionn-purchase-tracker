'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Mail, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface GmailLabel {
  id: string
  name: string
  type: string
}

interface SyncState {
  is_connected: boolean
  label_id: string | null
  label_name: string | null
  last_sync_at: string | null
  token_expiry: string | null
}

export default function GmailSettingsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const [labels, setLabels] = useState<GmailLabel[]>([])
  const [selectedLabelId, setSelectedLabelId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Check for OAuth callback results
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'true') {
      toast.success('Gmail connected successfully!')
      fetchSyncState()
    } else if (error) {
      toast.error(`Connection failed: ${error}`)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      fetchSyncState()
    }
  }, [user])

  const fetchSyncState = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_sync_state')
        .select('is_connected, label_id, label_name, last_sync_at, token_expiry')
        .maybeSingle()

      if (error) {
        console.error('Error fetching sync state:', error)
        return
      }

      if (data) {
        setSyncState(data)
        setSelectedLabelId(data.label_id || '')
        
        // If connected, fetch labels
        if (data.is_connected) {
          fetchLabels()
        }
      }
    } catch (error) {
      console.error('Error fetching sync state:', error)
    }
  }

  const fetchLabels = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/gmail/labels')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch labels')
      }

      setLabels(data.labels)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch Gmail labels')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      const response = await fetch('/api/auth/google')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate auth URL')
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Gmail')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('gmail_sync_state')
        .update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          token_expiry: null,
          label_id: null,
          label_name: null,
        })
        .eq('admin_user_id', user?.id)

      if (error) throw error

      setSyncState(null)
      setLabels([])
      setSelectedLabelId('')
      toast.success('Gmail disconnected successfully')
    } catch (error) {
      toast.error('Failed to disconnect Gmail')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLabel = async () => {
    if (!selectedLabelId) {
      toast.error('Please select a label')
      return
    }

    try {
      setLoading(true)
      const selectedLabel = labels.find(l => l.id === selectedLabelId)

      const { error } = await supabase
        .from('gmail_sync_state')
        .update({
          label_id: selectedLabelId,
          label_name: selectedLabel?.name || '',
        })
        .eq('admin_user_id', user?.id)

      if (error) throw error

      await fetchSyncState()
      toast.success('Label saved successfully')
    } catch (error) {
      toast.error('Failed to save label')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    if (!syncState?.label_id) {
      toast.error('Please select a label first')
      return
    }

    try {
      setSyncing(true)
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync emails')
      }

      toast.success(`Synced ${data.emailsSynced} emails successfully`)
      await fetchSyncState()
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync emails')
    } finally {
      setSyncing(false)
    }
  }

  const isTokenExpired = syncState?.token_expiry
    ? new Date(syncState.token_expiry) < new Date()
    : false

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gmail Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Connect your Gmail account to automatically sync bank transaction emails
        </p>
      </div>

      <div className="grid gap-6">
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Connection
            </CardTitle>
            <CardDescription>
              Connect your Gmail account to enable automatic email syncing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  {syncState?.is_connected ? (
                    <>
                      {isTokenExpired ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Token Expired
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                {syncState?.token_expiry && (
                  <p className="mt-1 text-xs text-gray-500">
                    Token expires: {format(new Date(syncState.token_expiry), 'PPp')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {syncState?.is_connected ? (
                  <>
                    {isTokenExpired && (
                      <Button
                        onClick={handleConnect}
                        disabled={connecting}
                      >
                        Reconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={loading}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : 'Connect Gmail'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Label Selection Card */}
        {syncState?.is_connected && !isTokenExpired && (
          <Card>
            <CardHeader>
              <CardTitle>Email Label</CardTitle>
              <CardDescription>
                Select which Gmail label to sync emails from (e.g., create a "Bank Alerts" label)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="label">Gmail Label</Label>
                  <Select
                    value={selectedLabelId}
                    onValueChange={setSelectedLabelId}
                    disabled={loading}
                  >
                    <SelectTrigger id="label">
                      <SelectValue placeholder="Select a label" />
                    </SelectTrigger>
                    <SelectContent>
                      {labels.map((label) => (
                        <SelectItem key={label.id} value={label.id}>
                          {label.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSaveLabel}
                    disabled={loading || !selectedLabelId}
                  >
                    Save Label
                  </Button>
                </div>
              </div>
              {syncState.label_name && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-blue-900">
                    Currently syncing from: <strong>{syncState.label_name}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sync Controls Card */}
        {syncState?.is_connected && syncState.label_id && !isTokenExpired && (
          <Card>
            <CardHeader>
              <CardTitle>Email Sync</CardTitle>
              <CardDescription>
                Manually trigger email sync or view sync history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  {syncState.last_sync_at ? (
                    <p className="text-sm text-gray-600">
                      Last synced: {format(new Date(syncState.last_sync_at), 'PPp')}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">Never synced</p>
                  )}
                </div>
                <Button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        {!syncState?.is_connected && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Click "Connect Gmail" to authorize access to your Gmail account</li>
                <li>Sign in with your Google account and grant permissions</li>
                <li>Create a Gmail label (e.g., "Bank Alerts") for bank transaction emails</li>
                <li>Set up filters in Gmail to automatically label bank emails</li>
                <li>Select the label in PurchaseTracker to sync those emails</li>
                <li>Sync emails manually or set up automatic syncing</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
