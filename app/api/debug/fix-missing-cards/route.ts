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

    const { dryRun = true } = await request.json()

    // Step 1: Find all purchases with NULL card_id that have a raw_email_id
    const { data: purchasesWithoutCards, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        merchant,
        amount,
        purchase_date,
        raw_email_id,
        raw_emails (
          id,
          sender,
          subject,
          body,
          parsing_rule_id,
          parsing_rules (
            id,
            name,
            card_last_four_pattern
          )
        )
      `)
      .is('card_id', null)
      .not('raw_email_id', 'is', null)
      .order('purchase_date', { ascending: false })

    if (purchasesError) {
      return NextResponse.json({ error: purchasesError.message }, { status: 500 })
    }

    if (!purchasesWithoutCards || purchasesWithoutCards.length === 0) {
      return NextResponse.json({ 
        message: 'No purchases found with missing cards',
        fixed: 0 
      })
    }

    // Step 2: Get all active parsing rules
    const { data: rules } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return NextResponse.json({ error: 'No active parsing rules found' }, { status: 400 })
    }

    const parser = new EmailParser(rules)
    const results = []
    let fixedCount = 0
    let failedCount = 0

    // Step 3: Re-parse each email and update the purchase
    for (const purchase of purchasesWithoutCards) {
      const email = purchase.raw_emails as any

      if (!email) {
        results.push({
          purchaseId: purchase.id,
          merchant: purchase.merchant,
          amount: purchase.amount,
          status: 'skipped',
          reason: 'No email found'
        })
        failedCount++
        continue
      }

      // Parse the email
      const parseResult = parser.parse(email)

      if (parseResult.success && parseResult.data?.card_last_four) {
        // Look up the card
        const { data: card, error: cardError } = await supabase
          .from('cards')
          .select('id, employee_id, last_four')
          .eq('last_four', parseResult.data.card_last_four)
          .eq('is_active', true)
          .maybeSingle() // Use maybeSingle instead of single to handle duplicates gracefully

        if (cardError) {
          results.push({
            purchaseId: purchase.id,
            merchant: purchase.merchant,
            amount: purchase.amount,
            extractedCard: parseResult.data.card_last_four,
            status: 'error',
            reason: cardError.message
          })
          failedCount++
          continue
        }

        if (!card) {
          results.push({
            purchaseId: purchase.id,
            merchant: purchase.merchant,
            amount: purchase.amount,
            extractedCard: parseResult.data.card_last_four,
            status: 'failed',
            reason: 'Card not found or multiple cards with same last_four'
          })
          failedCount++
          continue
        }

        // Update the purchase with the card_id and employee_id
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('purchases')
            .update({
              card_id: card.id,
              employee_id: card.employee_id
            })
            .eq('id', purchase.id)

          if (updateError) {
            results.push({
              purchaseId: purchase.id,
              merchant: purchase.merchant,
              amount: purchase.amount,
              extractedCard: parseResult.data.card_last_four,
              matchedCard: card.last_four,
              status: 'error',
              reason: updateError.message
            })
            failedCount++
            continue
          }
        }

        results.push({
          purchaseId: purchase.id,
          merchant: purchase.merchant,
          amount: purchase.amount,
          extractedCard: parseResult.data.card_last_four,
          matchedCard: card.last_four,
          cardId: card.id,
          employeeId: card.employee_id,
          status: 'fixed',
          dryRun
        })
        fixedCount++
      } else {
        results.push({
          purchaseId: purchase.id,
          merchant: purchase.merchant,
          amount: purchase.amount,
          status: 'failed',
          reason: parseResult.error || 'No card extracted from email'
        })
        failedCount++
      }
    }

    return NextResponse.json({
      dryRun,
      totalPurchases: purchasesWithoutCards.length,
      fixed: fixedCount,
      failed: failedCount,
      results
    })
  } catch (error: any) {
    console.error('Fix missing cards error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fix missing cards' },
      { status: 500 }
    )
  }
}
