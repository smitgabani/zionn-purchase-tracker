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

    // Get total emails count
    const { count: totalEmails, error: totalError } = await supabase
      .from('raw_emails')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id)

    if (totalError) throw totalError

    // Get successfully parsed emails (with active purchases)
    const { data: parsedWithPurchases, error: parsedError } = await supabase
      .from('raw_emails')
      .select('id, purchases!inner(id)')
      .eq('admin_user_id', user.id)
      .eq('parsed', true)

    if (parsedError) throw parsedError

    // Get orphaned emails (parsed but no purchase)
    const { data: allParsedEmails, error: allParsedError } = await supabase
      .from('raw_emails')
      .select('id, purchases(id)')
      .eq('admin_user_id', user.id)
      .eq('parsed', true)

    if (allParsedError) throw allParsedError

    const orphanedEmails = allParsedEmails?.filter(
      email => !email.purchases || email.purchases.length === 0
    ) || []

    // Get emails with parse errors
    const { count: parseErrorCount, error: errorCountError } = await supabase
      .from('raw_emails')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id)
      .eq('parsed', true)
      .not('parse_error', 'is', null)

    if (errorCountError) throw errorCountError

    // Get unparsed emails
    const { count: unparsedCount, error: unparsedError } = await supabase
      .from('raw_emails')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id)
      .eq('parsed', false)

    if (unparsedError) throw unparsedError

    // Get parsing rules stats
    const { data: allRules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('id, is_active')
      .eq('admin_user_id', user.id)

    if (rulesError) throw rulesError

    const activeRules = allRules?.filter(r => r.is_active).length || 0
    const totalRules = allRules?.length || 0

    // Get total purchases
    const { count: totalPurchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id)

    if (purchasesError) throw purchasesError

    // Get card stats
    const { count: totalCards, error: cardsError } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id)

    if (cardsError) throw cardsError

    return NextResponse.json({
      success: true,
      stats: {
        emails: {
          total: totalEmails || 0,
          successfullyParsed: parsedWithPurchases?.length || 0,
          orphaned: orphanedEmails.length,
          withParseErrors: parseErrorCount || 0,
          unparsed: unparsedCount || 0,
        },
        parsingRules: {
          total: totalRules,
          active: activeRules,
          inactive: totalRules - activeRules,
        },
        purchases: {
          total: totalPurchases || 0,
        },
        cards: {
          total: totalCards || 0,
        },
      },
      message: 'Parse status retrieved successfully',
    })
  } catch (error: any) {
    console.error('Error getting parse status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get parse status' },
      { status: 500 }
    )
  }
}
