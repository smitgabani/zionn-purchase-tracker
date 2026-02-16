import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GmailService } from '@/lib/gmail/service'
import { EmailParser } from '@/lib/parser/engine'
import { getGmailSyncState } from '@/lib/gmail/token-manager'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Gmail sync state with automatic token refresh
    let syncState
    try {
      syncState = await getGmailSyncState()
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Gmail not connected' },
        { status: 400 }
      )
    }

    if (!syncState.label_id) {
      return NextResponse.json(
        { error: 'No label selected' },
        { status: 400 }
      )
    }

    // Fetch ALL emails from Gmail using pagination
    const gmailService = new GmailService(
      syncState.access_token,
      syncState.refresh_token
    )

    console.log('Starting complete sync - fetching all messages...')
    const messages = await gmailService.getAllMessagesByLabel(syncState.label_id)
    console.log(`Fetched ${messages.length} total messages from Gmail`)

    let emailsSynced = 0
    let emailsSkipped = 0
    let emailsFailed = 0

    // Fetch parsing rules for the user
    const { data: parsingRules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('admin_user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rulesError) {
      console.error('Error fetching parsing rules:', rulesError)
      return NextResponse.json(
        { error: 'Failed to fetch parsing rules' },
        { status: 500 }
      )
    }

    // Process each message
    for (const message of messages) {
      try {
        // Check if email already exists (duplicate prevention)
        const { data: existingEmail } = await supabase
          .from('raw_emails')
          .select('id')
          .eq('gmail_message_id', message.id)
          .eq('admin_user_id', user.id)
          .single()

        if (existingEmail) {
          emailsSkipped++
          continue
        }

        // Get message details
        const messageDetails = await gmailService.getMessageDetails(message.id)

        // Store raw email
        const { data: rawEmail, error: emailError } = await supabase
          .from('raw_emails')
          .insert({
            admin_user_id: user.id,
            gmail_message_id: message.id,
            sender: messageDetails.from,
            subject: messageDetails.subject,
            body: messageDetails.body,
            received_at: messageDetails.receivedAt,
            parsed: false,
          })
          .select()
          .single()

        if (emailError) {
          console.error('Error storing email:', emailError)
          emailsFailed++
          continue
        }

        // Try to parse the email using the rawEmail object
        const parser = new EmailParser(parsingRules || [])
        const parseResult = parser.parse(rawEmail)

        if (parseResult.success && parseResult.data) {
          // Determine purchase date/time with fallback logic
          let purchaseDate: string | null = null

          if (parseResult.data.purchase_date) {
            // First priority: Use extracted date from email body (YYYY-MM-DD)
            // Note: We only extract date, not time, to avoid timezone issues
            purchaseDate = parseResult.data.purchase_date
          } else if (rawEmail.received_at) {
            // Second priority: Use email's received_at timestamp (full ISO timestamp)
            // This gives us accurate date AND time from when the email was received
            purchaseDate = rawEmail.received_at
          }

          // If no date available, mark as unparsed with error
          if (!purchaseDate) {
            await supabase
              .from('raw_emails')
              .update({
                parsed: false,
                parse_error: 'Cannot determine purchase date: no date in email and no received_at timestamp',
              })
              .eq('id', rawEmail.id)
            emailsFailed++
            continue
          }

          // Find card by last 4 digits (if provided)
          let cardId: string | null = null
          let employeeId: string | null = null

          if (parseResult.data.card_last_four) {
            const { data: card } = await supabase
              .from('cards')
              .select('id, employee_id')
              .eq('last_four', parseResult.data.card_last_four)
              .eq('is_active', true)
              .single()

            if (card) {
              cardId = card.id
              employeeId = card.employee_id
            }
          }

          // Create purchase from parsed data
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
              admin_user_id: user.id,
              amount: parseResult.data.amount,
              merchant: parseResult.data.merchant || null,
              purchase_date: purchaseDate,
              raw_email_id: rawEmail.id,
              source: 'email',
              description: messageDetails.subject,
              card_id: cardId,
              employee_id: employeeId,
            })

          if (purchaseError) {
            console.error('Error creating purchase:', purchaseError)
            // Mark email as parsed but with error
            await supabase
              .from('raw_emails')
              .update({
                parsed: true,
                parse_error: purchaseError.message,
                parsing_rule_id: parseResult.ruleId,
              })
              .eq('id', rawEmail.id)
            emailsFailed++
          } else {
            // Mark email as successfully parsed
            await supabase
              .from('raw_emails')
              .update({
                parsed: true,
                parsing_rule_id: parseResult.ruleId,
              })
              .eq('id', rawEmail.id)
            emailsSynced++
          }
        } else {
          // No matching parsing rule found
          await supabase
            .from('raw_emails')
            .update({
              parsed: false,
              parse_error: parseResult.error || 'No matching parsing rule found',
            })
            .eq('id', rawEmail.id)
          emailsFailed++
        }
      } catch (error: any) {
        console.error('Error processing message:', error)
        emailsFailed++
      }
    }

    // Update last sync time
    await supabase
      .from('gmail_sync_state')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('admin_user_id', user.id)

    return NextResponse.json({
      success: true,
      total: messages.length,
      synced: emailsSynced,
      skipped: emailsSkipped,
      failed: emailsFailed,
    })
  } catch (error: any) {
    console.error('Complete sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete sync' },
      { status: 500 }
    )
  }
}
