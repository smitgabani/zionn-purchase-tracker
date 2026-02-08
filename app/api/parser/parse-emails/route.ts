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

    // Get active parsing rules
    const { data: rules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rulesError) {
      throw new Error('Failed to fetch parsing rules')
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json(
        { error: 'No active parsing rules found' },
        { status: 400 }
      )
    }

    // Get unparsed emails
    const { data: emails, error: emailsError } = await supabase
      .from('raw_emails')
      .select('*')
      .eq('parsed', false)
      .order('received_at', { ascending: false })
      .limit(100) // Parse up to 100 emails at a time

    if (emailsError) {
      throw new Error('Failed to fetch emails')
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({
        message: 'No unparsed emails found',
        emailsParsed: 0,
        purchasesCreated: 0,
      })
    }

    // Initialize parser
    const parser = new EmailParser(rules)

    let emailsParsed = 0
    let purchasesCreated = 0
    let emailsFailed = 0

    // Parse each email
    for (const email of emails) {
      try {
        const result = parser.parse(email)

        if (result.success && result.data) {
          // Find card by last 4 digits (if provided)
          let cardId: string | null = null
          let employeeId: string | null = null

          if (result.data.card_last_four) {
            const { data: card } = await supabase
              .from('cards')
              .select('id, employee_id')
              .eq('last_four', result.data.card_last_four)
              .eq('is_active', true)
              .single()

            if (card) {
              cardId = card.id
              employeeId = card.employee_id
            }
          }

          // Create purchase
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
              admin_user_id: user.id,
              amount: result.data.amount,
              merchant: result.data.merchant || null,
              description: result.data.description || null,
              purchase_date: result.data.purchase_date || new Date().toISOString().split('T')[0],
              card_id: cardId,
              employee_id: employeeId,
              raw_email_id: email.id,
              source: 'email',
              is_reviewed: false,
            })

          if (purchaseError) {
            console.error('Error creating purchase:', purchaseError)
            throw purchaseError
          }

          purchasesCreated++

          // Mark email as parsed
          await supabase
            .from('raw_emails')
            .update({
              parsed: true,
              parsing_rule_id: result.ruleId || null,
              parse_error: null,
            })
            .eq('id', email.id)

          emailsParsed++
        } else {
          // Mark as parsed but with error
          await supabase
            .from('raw_emails')
            .update({
              parsed: true,
              parse_error: result.error || 'Failed to extract data',
            })
            .eq('id', email.id)

          emailsFailed++
        }
      } catch (error: any) {
        console.error(`Error parsing email ${email.id}:`, error)

        // Mark as parsed with error
        await supabase
          .from('raw_emails')
          .update({
            parsed: true,
            parse_error: error.message || 'Unknown error',
          })
          .eq('id', email.id)

        emailsFailed++
      }
    }

    return NextResponse.json({
      message: 'Parsing complete',
      emailsParsed,
      purchasesCreated,
      emailsFailed,
      totalProcessed: emails.length,
    })
  } catch (error: any) {
    console.error('Error parsing emails:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse emails' },
      { status: 500 }
    )
  }
}
