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

    // Get parse mode from request body
    const body = await request.json().catch(() => ({}))
    const mode = body.mode || 'quick' // 'quick', 'smart-full', 'full-reparse', 'force-full'

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

    let emails: any[]

    // Get emails based on mode
    if (mode === 'quick') {
      // Quick Parse: Only unparsed emails
      const { data, error: emailsError } = await supabase
        .from('raw_emails')
        .select('*')
        .eq('admin_user_id', user.id)
        .eq('parsed', false)
        .order('received_at', { ascending: false })
        .limit(100)

      if (emailsError) throw new Error('Failed to fetch emails')
      emails = data || []

    } else if (mode === 'smart-full') {
      // Smart Full Parse: Orphaned emails (parsed but no purchase)
      const { data: allParsedEmails, error: emailsError } = await supabase
        .from('raw_emails')
        .select('*, purchases(id)')
        .eq('admin_user_id', user.id)
        .eq('parsed', true)
        .order('received_at', { ascending: false })
        .limit(200)

      if (emailsError) throw new Error('Failed to fetch emails')

      // Filter to only orphaned emails
      const orphaned = allParsedEmails?.filter(
        email => !email.purchases || email.purchases.length === 0
      ) || []

      // Reset them to unparsed first
      if (orphaned.length > 0) {
        const orphanedIds = orphaned.map(e => e.id)
        await supabase
          .from('raw_emails')
          .update({ parsed: false, parse_error: null, parsing_rule_id: null })
          .in('id', orphanedIds)
          .eq('admin_user_id', user.id)
      }

      emails = orphaned

    } else if (mode === 'full-reparse') {
      // Full Re-parse: All emails with duplicate checking
      const { data, error: emailsError } = await supabase
        .from('raw_emails')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(500)

      if (emailsError) throw new Error('Failed to fetch emails')
      emails = data || []

    } else if (mode === 'force-full') {
      // Force Full Re-parse: All emails without duplicate checking
      const { data, error: emailsError } = await supabase
        .from('raw_emails')
        .select('*')
        .eq('admin_user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(500)

      if (emailsError) throw new Error('Failed to fetch emails')
      emails = data || []

    } else {
      return NextResponse.json(
        { error: 'Invalid mode. Must be: quick, smart-full, full-reparse, or force-full' },
        { status: 400 }
      )
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({
        message: mode === 'smart-full'
          ? 'No orphaned emails found'
          : 'No emails found to parse',
        emailsParsed: 0,
        purchasesCreated: 0,
        mode,
      })
    }

    // Initialize parser
    const parser = new EmailParser(rules)

    let emailsParsed = 0
    let purchasesCreated = 0
    let emailsFailed = 0
    let purchasesSkipped = 0

    // Parse each email
    for (const email of emails) {
      try {
        const result = parser.parse(email)

        if (result.success && result.data) {
          // Determine purchase date/time with fallback logic
          let purchaseDate: string | null = null

          if (result.data.purchase_date) {
            // First priority: Use extracted date from email body (YYYY-MM-DD)
            // Note: We only extract date, not time, to avoid timezone issues
            purchaseDate = result.data.purchase_date
          } else if (email.received_at) {
            // Second priority: Use email's received_at timestamp (full ISO timestamp)
            // This gives us accurate date AND time from when the email was received
            purchaseDate = email.received_at
          }

          // If no date available, mark as unparsed with error and skip
          if (!purchaseDate) {
            await supabase
              .from('raw_emails')
              .update({
                parsed: false,
                parse_error: 'Cannot determine purchase date: no date in email and no received_at timestamp',
              })
              .eq('id', email.id)

            emailsFailed++
            continue // Skip to next email
          }

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

          // Check for duplicate if in full-reparse mode (not force-full)
          let shouldCreatePurchase = true
          if (mode === 'full-reparse') {
            const { data: existingPurchase } = await supabase
              .from('purchases')
              .select('id')
              .eq('admin_user_id', user.id)
              .eq('raw_email_id', email.id)
              .single()

            if (existingPurchase) {
              shouldCreatePurchase = false
              purchasesSkipped++
            }
          }

          // Create purchase
          if (shouldCreatePurchase) {
            const { error: purchaseError } = await supabase
              .from('purchases')
              .insert({
                admin_user_id: user.id,
                amount: result.data.amount,
                merchant: result.data.merchant || null,
                description: result.data.description || null,
                purchase_date: purchaseDate,
                card_id: cardId,
                employee_id: employeeId,
                raw_email_id: email.id,
                source: 'email',
                reviewed_by_initials: null,
              })

            if (purchaseError) {
              console.error('Error creating purchase:', purchaseError)
              throw purchaseError
            }

            purchasesCreated++
          }

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
          // Mark as parsed but with error (only if not already parsed)
          if (!email.parsed) {
            await supabase
              .from('raw_emails')
              .update({
                parsed: true,
                parse_error: result.error || 'Failed to extract data',
              })
              .eq('id', email.id)
          }

          emailsFailed++
        }
      } catch (error: any) {
        console.error(`Error parsing email ${email.id}:`, error)

        // Mark as parsed with error (only if not already parsed)
        if (!email.parsed) {
          await supabase
            .from('raw_emails')
            .update({
              parsed: true,
              parse_error: error.message || 'Unknown error',
            })
            .eq('id', email.id)
        }

        emailsFailed++
      }
    }

    const modeDescriptions = {
      quick: 'Quick Parse (unparsed emails only)',
      'smart-full': 'Smart Full Parse (orphaned emails)',
      'full-reparse': 'Full Re-parse (with duplicate check)',
      'force-full': 'Force Full Re-parse (all emails)',
    }

    return NextResponse.json({
      message: 'Parsing complete',
      mode: modeDescriptions[mode as keyof typeof modeDescriptions] || mode,
      emailsParsed,
      purchasesCreated,
      purchasesSkipped: mode === 'full-reparse' ? purchasesSkipped : undefined,
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
