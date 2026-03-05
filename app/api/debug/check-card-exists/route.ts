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

    const { searchParams } = new URL(request.url)
    const lastFour = searchParams.get('lastFour') || '0691'

    // Check if card exists
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select(`
        id, 
        last_four, 
        bank_name, 
        is_active, 
        employee_id,
        employees!cards_employee_id_fkey (
          name,
          initials
        )
      `)
      .eq('last_four', lastFour)

    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 500 })
    }

    // Get the problematic purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select(`
        id,
        merchant,
        amount,
        purchase_date,
        card_id,
        employee_id,
        raw_email_id,
        raw_emails (
          id,
          sender,
          subject,
          body,
          parsed,
          parse_error,
          parsing_rule_id,
          parsing_rules (
            id,
            name,
            card_last_four_pattern
          )
        )
      `)
      .eq('merchant', 'COLONIAL COLD BEER& WINE')
      .eq('amount', 78.80)
      .order('purchase_date', { ascending: false })
      .limit(1)
      .single()

    // Get all cards for comparison
    const { data: allCards } = await supabase
      .from('cards')
      .select('id, last_four, bank_name, is_active')
      .order('last_four')

    return NextResponse.json({
      searchedFor: lastFour,
      cardsFound: cards?.length || 0,
      cards: cards || [],
      purchase: purchase || null,
      allCards: allCards || [],
      diagnosis: {
        cardExists: (cards?.length || 0) > 0,
        cardIsActive: cards?.some(c => c.is_active) || false,
        multipleCards: (cards?.length || 0) > 1,
        purchaseHasCardId: !!purchase?.card_id,
        purchaseWasParsed: !!purchase?.raw_email_id,
      }
    })
  } catch (error: any) {
    console.error('Check card error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check card' },
      { status: 500 }
    )
  }
}
