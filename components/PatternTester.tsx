'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayCircle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PatternTesterProps {
  ruleId: string
}

export default function PatternTester({ ruleId }: PatternTesterProps) {
  const [sampleText, setSampleText] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleTest = async () => {
    if (!sampleText.trim()) {
      toast.error('Please enter sample text')
      return
    }

    try {
      setTesting(true)
      setResult(null)

      const response = await fetch('/api/parser/test-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          sampleText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test rule')
      }

      setResult(data)
    } catch (error: any) {
      toast.error(error.message || 'Failed to test rule')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Pattern</CardTitle>
        <CardDescription>
          Test your regex patterns against sample email text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sample-text">Sample Email Text</Label>
          <textarea
            id="sample-text"
            className="w-full min-h-[150px] rounded-md border border-gray-300 p-3 text-sm"
            placeholder="Paste a sample bank email here..."
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
          />
        </div>

        <Button onClick={handleTest} disabled={testing} className="w-full gap-2">
          <PlayCircle className="h-4 w-4" />
          {testing ? 'Testing...' : 'Test Pattern'}
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.matches ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">Pattern Matches!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-600">Pattern Does Not Match</span>
                </>
              )}
            </div>

            {result.error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                <strong>Error:</strong> {result.error}
              </div>
            )}

            {result.extracted && (
              <div className="rounded-md bg-green-50 p-3">
                <h4 className="mb-2 font-semibold text-green-900">Extracted Data:</h4>
                <dl className="space-y-1 text-sm">
                  {result.extracted.amount !== undefined && (
                    <div className="flex gap-2">
                      <dt className="font-medium text-green-800">Amount:</dt>
                      <dd className="text-green-900">${result.extracted.amount.toFixed(2)}</dd>
                    </div>
                  )}
                  {result.extracted.merchant && (
                    <div className="flex gap-2">
                      <dt className="font-medium text-green-800">Merchant:</dt>
                      <dd className="text-green-900">{result.extracted.merchant}</dd>
                    </div>
                  )}
                  {result.extracted.purchase_date && (
                    <div className="flex gap-2">
                      <dt className="font-medium text-green-800">Date:</dt>
                      <dd className="text-green-900">{result.extracted.purchase_date}</dd>
                    </div>
                  )}
                  {result.extracted.card_last_four && (
                    <div className="flex gap-2">
                      <dt className="font-medium text-green-800">Card (Last 4):</dt>
                      <dd className="text-green-900">{result.extracted.card_last_four}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {result.matches && !result.extracted && (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                Pattern matches but no data was extracted. Check your capture groups.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
