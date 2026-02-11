'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, RefreshCw, Trash2, Database, Mail, FileText, AlertTriangle, SearchX, BarChart3, TestTube2, Shield, RotateCcw, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

type ToolAction = {
  id: string
  name: string
  description: string
  endpoint: string
  icon: any
  variant: 'default' | 'outline' | 'destructive'
  method: 'GET' | 'POST'
  confirm?: string
  body?: any
}

export default function ToolsPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (
    action: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: any,
    successMessage?: string
  ) => {
    try {
      setLoading(action)
      const options: RequestInit = { method }

      if (body && method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(body)
      }

      const response = await fetch(endpoint, options)
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
      logger.log(`[${action}] Result:`, data)

      // Show specific stats if available
      if (data.emailsParsed !== undefined) {
        toast.info(`Parsed: ${data.emailsParsed} | Created: ${data.purchasesCreated || 0} purchases`)
      }

      // Show parse status stats
      if (data.stats) {
        const { emails } = data.stats
        toast.info(
          `Total: ${emails.total} | Parsed: ${emails.successfullyParsed} | Orphaned: ${emails.orphaned} | Unparsed: ${emails.unparsed}`
        )
      }

      // Show integrity check results
      if (data.summary && data.summary.totalIssues !== undefined) {
        if (data.summary.totalIssues === 0) {
          toast.success('No integrity issues found!')
        } else {
          toast.warning(`Found ${data.summary.totalIssues} issue(s) - check console for details`)
        }
      }

      // Show dry-run results
      if (data.summary && data.summary.total !== undefined) {
        toast.info(`Dry-run: ${data.summary.succeeded} succeeded, ${data.summary.failed} failed`)
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
      category: 'Parsing Operations',
      icon: PlayCircle,
      color: 'green',
      description: 'Parse emails and create purchases',
      actions: [
        {
          id: 'quick-parse',
          name: 'Quick Parse',
          description: 'Parse unparsed emails only (normal operation)',
          endpoint: '/api/parser/parse-emails',
          icon: PlayCircle,
          variant: 'default',
          method: 'POST',
          body: { mode: 'quick' },
        },
        {
          id: 'smart-full-parse',
          name: 'Smart Full Parse',
          description: 'Re-parse orphaned emails (parsed but no purchase). Best after deleting purchases.',
          endpoint: '/api/parser/parse-emails',
          icon: RefreshCw,
          variant: 'default',
          method: 'POST',
          body: { mode: 'smart-full' },
        },
        {
          id: 'full-reparse',
          name: 'Full Re-parse (Duplicate Check)',
          description: 'Re-parse all emails but skip existing purchases. Slower but thorough.',
          endpoint: '/api/parser/parse-emails',
          icon: RefreshCw,
          variant: 'outline',
          method: 'POST',
          body: { mode: 'full-reparse' },
          confirm: 'This will re-parse all emails (with duplicate checking). Continue?',
        },
        {
          id: 'force-full-reparse',
          name: 'Force Full Re-parse',
          description: 'Re-parse ALL emails and create new purchases (will create duplicates). Use for testing only.',
          endpoint: '/api/parser/parse-emails',
          icon: AlertTriangle,
          variant: 'outline',
          method: 'POST',
          body: { mode: 'force-full' },
          confirm: 'WARNING: This will create duplicate purchases! Only use for testing. Continue?',
        },
      ] as ToolAction[],
    },
    {
      category: 'Email Management',
      icon: Mail,
      color: 'blue',
      description: 'Sync and manage emails',
      actions: [
        {
          id: 'sync-gmail',
          name: 'Sync Gmail',
          description: 'Fetch new emails from Gmail and auto-parse them',
          endpoint: '/api/gmail/sync',
          icon: Mail,
          variant: 'default',
          method: 'POST',
        },
        {
          id: 'reset-emails',
          name: 'Reset All Emails',
          description: 'Mark all emails as unparsed (useful after changing parsing rules)',
          endpoint: '/api/debug/reset-emails',
          icon: RotateCcw,
          variant: 'outline',
          method: 'POST',
          confirm: 'This will mark all emails as unparsed. Continue?',
        },
        {
          id: 'find-orphaned',
          name: 'Find Orphaned Emails',
          description: 'List emails marked as parsed but have no associated purchase',
          endpoint: '/api/debug/orphaned-emails',
          icon: SearchX,
          variant: 'outline',
          method: 'GET',
        },
      ] as ToolAction[],
    },
    {
      category: 'Diagnostics',
      icon: Database,
      color: 'purple',
      description: 'View system status and debug issues',
      actions: [
        {
          id: 'parse-status',
          name: 'Parse Status Dashboard',
          description: 'Comprehensive stats: emails, purchases, rules, parsing status',
          endpoint: '/api/debug/parse-status',
          icon: BarChart3,
          variant: 'default',
          method: 'GET',
        },
        {
          id: 'dry-run-parse',
          name: 'Dry-Run Parser',
          description: 'Test parsing on unparsed emails without creating purchases',
          endpoint: '/api/debug/dry-run-parse',
          icon: TestTube2,
          variant: 'outline',
          method: 'POST',
          body: { testUnparsed: true },
        },
        {
          id: 'integrity-check',
          name: 'Data Integrity Check',
          description: 'Find orphaned emails, duplicate purchases, and other data issues',
          endpoint: '/api/debug/integrity-check',
          icon: Shield,
          variant: 'outline',
          method: 'GET',
        },
        {
          id: 'check-parsing',
          name: 'View System Status',
          description: 'Basic system info: last 10 emails, rules, cards, purchases',
          endpoint: '/api/debug/check-parsing',
          icon: Database,
          variant: 'outline',
          method: 'GET',
        },
        {
          id: 'test-date-extraction',
          name: 'Test Date Extraction',
          description: 'Analyze date extraction on recent emails and show what dates would be used',
          endpoint: '/api/debug/test-date-extraction',
          icon: TestTube2,
          variant: 'outline',
          method: 'GET',
        },
        {
          id: 'test-card-extraction',
          name: 'Test Card Extraction',
          description: 'Test card number extraction on recent emails and check database lookup',
          endpoint: '/api/debug/test-card-extraction',
          icon: CreditCard,
          variant: 'outline',
          method: 'GET',
        },
      ] as ToolAction[],
    },
    {
      category: 'Dangerous Actions',
      icon: AlertTriangle,
      color: 'red',
      description: 'Use with caution - irreversible operations',
      actions: [
        {
          id: 'delete-purchases',
          name: 'Delete All Purchases',
          description: 'Delete all purchases and reset their emails to unparsed. Cannot be undone!',
          endpoint: '/api/debug/delete-purchases',
          icon: Trash2,
          variant: 'destructive',
          method: 'POST',
          confirm: '⚠️ WARNING: This will permanently delete ALL purchases and reset their emails. This CANNOT be undone. Are you absolutely sure?',
        },
      ] as ToolAction[],
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
          <Card key={section.category} className={section.color === 'red' ? 'border-red-300' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="h-5 w-5" />
                {section.category}
              </CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
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
                    variant={action.variant as any}
                    size="sm"
                    onClick={() => {
                      if (action.confirm && !confirm(action.confirm)) return
                      handleAction(
                        action.id,
                        action.endpoint,
                        action.method,
                        action.body
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

      {/* Workflow Documentation */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Recommended Workflows</CardTitle>
          <CardDescription className="text-blue-700">
            Follow these workflows for common scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">1. Normal Operation</h4>
              <p className="text-sm text-blue-800">
                <strong>Sync Gmail</strong> → Automatically parses new emails → View results
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 mb-1">2. After Changing Parsing Rules</h4>
              <p className="text-sm text-blue-800">
                <strong>Reset All Emails</strong> → <strong>Quick Parse</strong> → Check purchases
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 mb-1">3. After Deleting Purchases</h4>
              <p className="text-sm text-blue-800">
                <strong>Smart Full Parse</strong> (automatically triggered by delete button) → Orphaned emails re-parsed
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 mb-1">4. Finding Missing Purchases</h4>
              <p className="text-sm text-blue-800">
                <strong>Find Orphaned Emails</strong> → Review list → <strong>Smart Full Parse</strong> to recover
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 mb-1">5. Testing New Parsing Rules</h4>
              <p className="text-sm text-blue-800">
                <strong>Dry-Run Parser</strong> → Check extracted data → Adjust rules → <strong>Quick Parse</strong>
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 mb-1">6. Data Health Check</h4>
              <p className="text-sm text-blue-800">
                <strong>Parse Status Dashboard</strong> → <strong>Integrity Check</strong> → Fix issues as needed
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-300">
            <h4 className="font-semibold text-blue-900 mb-2">Tips</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Check browser console (F12) for detailed output</li>
              <li>• Toast notifications show quick results</li>
              <li>• Use <strong>Quick Parse</strong> for daily operations</li>
              <li>• Use <strong>Smart Full Parse</strong> after deleting purchases</li>
              <li>• Use <strong>Full Re-parse</strong> to recover from issues</li>
              <li>• <strong>Force Full Re-parse</strong> creates duplicates - only use for testing!</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Verification Guide */}
      <Card className="mt-6 bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-900">System Verification Guide</CardTitle>
          <CardDescription className="text-green-700">
            How to verify everything is working correctly using page counters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-green-900 mb-1">1. Before Deleting Purchases</h4>
              <ul className="text-sm text-green-800 space-y-1 ml-4">
                <li>• <strong>Purchases page:</strong> Should show same number as emails with successful parses</li>
                <li>• <strong>Emails page:</strong> Check "Parsed" count matches purchases count</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-900 mb-1">2. After Deleting Purchases</h4>
              <ul className="text-sm text-green-800 space-y-1 ml-4">
                <li>• <strong>Purchases page:</strong> Should show 0 total purchases</li>
                <li>• <strong>Emails page:</strong> "Parsed" count should drop (emails reset to unparsed)</li>
                <li>• <strong>Emails page:</strong> "Unparsed" count should increase by the number of purchases deleted</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-900 mb-1">3. After Re-parsing</h4>
              <ul className="text-sm text-green-800 space-y-1 ml-4">
                <li>• <strong>Purchases page:</strong> Total should match previous count (before deletion)</li>
                <li>• <strong>Emails page:</strong> "Parsed" count should increase back to original</li>
                <li>• <strong>Emails page:</strong> "Unparsed" count should decrease to near zero</li>
                <li>• <strong>Emails page:</strong> "Errors" will show if any emails failed to parse</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-300 bg-green-100/50 p-3 rounded-md">
            <h4 className="font-semibold text-green-900 mb-2">✓ Quick Check</h4>
            <p className="text-sm text-green-800">
              <strong>Total Purchases</strong> = <strong>Emails Parsed</strong> - <strong>Emails with Errors</strong>
            </p>
            <p className="text-xs text-green-700 mt-1">
              If this equation doesn't match, check the "Orphaned Emails" tool to find emails without purchases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
