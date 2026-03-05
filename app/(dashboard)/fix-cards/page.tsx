'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function FixCardsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runFix = async (dryRun: boolean) => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/fix-missing-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix cards')
      }

      setResults(data)
      
      if (dryRun) {
        toast.success(`Dry run complete: ${data.fixed} purchases can be fixed`)
      } else {
        toast.success(`Fixed ${data.fixed} purchases!`)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Fix Missing Card Numbers</h1>

      <Card className="mb-6 bg-blue-50 border-blue-300">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Before You Start</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-semibold">IMPORTANT: First fix the duplicate card issue!</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>You have TWO active cards with last_four = "0691"</li>
            <li>Go to your Supabase SQL Editor</li>
            <li>Run this query to see which employee each belongs to:</li>
          </ol>
          <pre className="bg-white p-3 rounded text-xs mt-2 overflow-x-auto">
{`SELECT 
  c.id,
  c.last_four,
  c.employee_id,
  e.name as employee_name,
  c.created_at
FROM cards c
LEFT JOIN employees e ON c.employee_id = e.id
WHERE c.last_four = '0691'
ORDER BY c.created_at;`}
          </pre>
          <p className="mt-2">4. Then deactivate the duplicate card:</p>
          <pre className="bg-white p-3 rounded text-xs mt-2">
{`UPDATE cards 
SET is_active = false 
WHERE id = 'PASTE_THE_DUPLICATE_CARD_ID';`}
          </pre>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run the Fix</CardTitle>
          <CardDescription>
            Re-parse emails and update purchases with missing card numbers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => runFix(true)}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? 'Running...' : 'Test Fix (Dry Run)'}
            </Button>
            <Button
              onClick={() => runFix(false)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Running...' : 'Apply Fix (Update Database)'}
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            💡 Tip: Run "Test Fix" first to see what will be changed before applying
          </p>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          <Card className={results.fixed > 0 ? 'border-green-500' : 'border-yellow-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.dryRun ? 'Dry Run Results' : 'Fix Results'}
                {results.fixed > 0 && <Badge className="bg-green-600">{results.fixed} Fixed</Badge>}
                {results.failed > 0 && <Badge variant="destructive">{results.failed} Failed</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">{results.totalPurchases}</div>
                  <div className="text-sm text-gray-600">Total Purchases</div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{results.fixed}</div>
                  <div className="text-sm text-gray-600">Fixed</div>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {results.dryRun && results.fixed > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-400 rounded mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ This was a dry run. Click "Apply Fix" to actually update the database.
                  </p>
                </div>
              )}

              {!results.dryRun && results.fixed > 0 && (
                <div className="p-3 bg-green-50 border border-green-400 rounded mb-4">
                  <p className="text-green-800 text-sm">
                    ✅ Successfully updated {results.fixed} purchase(s) with card information!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {results.results && results.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Results ({results.results.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.status === 'fixed'
                          ? 'bg-green-50 border-green-300'
                          : result.status === 'failed'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">
                          {result.merchant} - ${result.amount}
                        </div>
                        <Badge
                          variant={result.status === 'fixed' ? 'default' : 'destructive'}
                          className={result.status === 'fixed' ? 'bg-green-600' : ''}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {result.extractedCard && (
                          <div>Extracted Card: {result.extractedCard}</div>
                        )}
                        {result.matchedCard && (
                          <div>Matched Card: {result.matchedCard}</div>
                        )}
                        {result.cardId && (
                          <div className="font-mono text-xs">Card ID: {result.cardId}</div>
                        )}
                        {result.reason && (
                          <div className="text-red-600">Reason: {result.reason}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
