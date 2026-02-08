import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check emails
    const { data: emails, error: emailsError } = await supabase
      .from('raw_emails')
      .select('id, sender, subject, parsed, parse_error')
      .order('created_at', { ascending: false })
      .limit(10)

    // Check parsing rules
    const { data: rules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('id, name, is_active, priority')
      .order('priority', { ascending: false })

    // Check cards
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('id, last_four, bank_name, employee_id')

    // Check purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('id, amount, merchant, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      emails: {
        count: emails?.length || 0,
        data: emails || [],
        error: emailsError?.message,
      },
      rules: {
        count: rules?.length || 0,
        active: rules?.filter(r => r.is_active).length || 0,
        data: rules || [],
        error: rulesError?.message,
      },
      cards: {
        count: cards?.length || 0,
        data: cards || [],
        error: cardsError?.message,
      },
      purchases: {
        count: purchases?.length || 0,
        fromEmail: purchases?.filter(p => p.source === 'email').length || 0,
        data: purchases || [],
        error: purchasesError?.message,
      },
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to debug' },
      { status: 500 }
    )
  }
}
