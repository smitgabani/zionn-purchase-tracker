'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function GmailIntegration() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [labelName, setLabelName] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  useEffect(() => {
    checkGmailConnection()
  }, [])

  const checkGmailConnection = async () => {
    try {
      // This would normally check the gmail_sync_state table
      // For now, just placeholder
      setIsConnected(false)
    } catch (error) {
      console.error('Error checking Gmail connection:', error)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      window.location.href = '/api/auth/google'
    } catch (error) {
      console.error('Error connecting to Gmail:', error)
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      // Add disconnect logic here
      setIsConnected(false)
      setLabelName(null)
      setLastSyncAt(null)
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/gmail/sync', { method: 'POST' })
      if (response.ok) {
        await checkGmailConnection()
      }
    } catch (error) {
      console.error('Error syncing Gmail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Gmail Integration</CardTitle>
          </div>
          {isConnected ? (
            <Badge variant="default" className="flex items-center gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your Gmail account to automatically parse purchase emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            {labelName && (
              <div className="text-sm">
                <span className="text-gray-600">Label: </span>
                <span className="font-medium">{labelName}</span>
              </div>
            )}
            {lastSyncAt && (
              <div className="text-sm">
                <span className="text-gray-600">Last sync: </span>
                <span className="font-medium">
                  {new Date(lastSyncAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={isLoading}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={isLoading}
                variant="outline"
              >
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div>
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
