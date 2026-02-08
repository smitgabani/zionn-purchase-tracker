'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, RefreshCw, Trash2, Database, Mail, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function ToolsPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (
    action: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    successMessage?: string
  ) => {
    try {
      setLoading(action)
      const response = await fetch(endpoint, { method })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }

      // Show custom success message or default
      if (successMessage) {
        toast.success(successMessage)
      } else if (data.message) {
        toast.success(data.message)
      } else {
        toast.success('Action completed successfully')
      }

      // Log detailed results
      console.log(`[${action}] Result:`, data)
      
      // Show specific stats if available
      if (data.emailsParsed !== undefined) {
        toast.info(`Parsed: ${data.emailsParsed} | Created: ${data.purchasesCreated || 0} purchases`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Action failed')
      console.error(`[${action}] Error:`, error)
    } finally {
      setLoading(null)
    }
  }

  const tools = [
    {
      category: 'Email Parsing',
      icon: FileText,
      color: 'blue',
      actions: [
        {
          id: 'parse-emails',
          name: 'Parse Unparsed Emails',
          description: 'Parse all unparsed emails using active parsing rules and create purchases',
          endpoint: '/api/parser/parse-emails',
          icon: PlayCircle,
          variant: 'default' as const,
          method: 'POST' as const,
        },
        {
          id: 'reset-emails',
          name: 'Reset All Emails',
          description: 'Mark all emails as unparsed (useful for re-parsing after rule changes)',
          endpoint: '/api/debug/reset-emails',
          icon: RefreshCw,
          variant: 'outline' as const,
          method: 'POST' as const,
          confirm: 'This will mark all emails as unparsed. Continue?',
        },
      ],
    },
    {
      category: 'Gmail Sync',
      icon: Mail,
      color: 'green',
      actions: [
        {
          id: 'sync-gmail',
          name: 'Sync Gmail',
          description: 'Fetch new emails from Gmail and auto-parse them',
          endpoint: '/api/gmail/sync',
          icon: RefreshCw,
          variant: 'default' as const,
          method: 'POST' as const,
        },
      ],
    },
    {
      category: 'Diagnostics',
      icon: Database,
      color: 'purple',
      actions: [
        {
          id: 'check-parsing',
          name: 'View System Status',
          description: 'Check emails, rules, cards, and purchases count',
          endpoint: '/api/debug/check-parsing',
          icon: Database,
          variant: 'outline' as const,
          method: 'GET' as const,
        },
      ],
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Tools</h1>
        <p className="mt-1 text-sm text-gray-600">
          Useful actions for debugging and managing the system
        </p>
      </div>

      <div className="space-y-6">
        {tools.map((section) => (
          <Card key={section.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="h-5 w-5" />
                {section.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start justify-between rounded-lg border p-4 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <action.icon className="h-4 w-4 text-gray-500" />
                      <h3 className="font-medium">{action.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {action.description}
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {action.method} {action.endpoint}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant={action.variant}
                    size="sm"
                    onClick={() => {
                      if (action.confirm && !confirm(action.confirm)) return
                      handleAction(
                        action.id,
                        action.endpoint,
                        action.method
                      )
                    }}
                    disabled={loading === action.id}
                  >
                    {loading === action.id ? 'Running...' : 'Run'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>• Click any "Run" button to execute the action</p>
          <p>• Check browser console (F12) for detailed output</p>
          <p>• Toast notifications show quick results</p>
          <p>• Use "Reset All Emails" after changing parsing rules</p>
          <p>• Use "Parse Unparsed Emails" to manually trigger parsing</p>
        </CardContent>
      </Card>
    </div>
  )
}
