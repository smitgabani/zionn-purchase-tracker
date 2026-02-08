import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmailParser } from '@/lib/parser/engine'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ruleId, sampleText } = body

    if (!ruleId || !sampleText) {
      return NextResponse.json(
        { error: 'Missing ruleId or sampleText' },
        { status: 400 }
      )
    }

    // Get the rule
    const { data: rule, error: ruleError } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('id', ruleId)
      .single()

    if (ruleError || !rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    // Test the rule
    const result = EmailParser.testRule(sampleText, rule)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error testing rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to test rule' },
      { status: 500 }
    )
  }
}
