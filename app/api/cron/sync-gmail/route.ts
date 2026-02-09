import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GmailService } from '@/lib/gmail/service'
import { EmailParser } from '@/lib/parser/engine'
import { getGmailSyncState } from '@/lib/gmail/token-manager'

export const runtime = 'nodejs'

/**
 * Cron job endpoint to auto-sync Gmail emails every 15 minutes
 * Called automatically by Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all users with Gmail connected
    const { data: syncStates, error: syncError } = await supabase
      .from('gmail_sync_state')
      .select('*')
      .eq('is_connected', true)

    if (syncError) throw syncError

    if (!syncStates || syncStates.length === 0) {
      return NextResponse.json({ 
        message: 'No users with Gmail connected',
        synced: 0 
      })
    }

    let totalSynced = 0
    let totalFailed = 0
    const results = []

    // Sync emails for each user
    for (const syncState of syncStates) {
      try {
        // Check if token needs refresh
        const gmailService = new GmailService(
          syncState.access_token,
          syncState.refresh_token
        )

        if (!syncState.label_id) {
          results.push({
            user_id: syncState.admin_user_id,
            status: 'skipped',
            reason: 'No label selected'
          })
          continue
        }

        // Fetch emails
        const { messages } = await gmailService.getMessagesByLabel(
          syncState.label_id,
          50
        )

        // Fetch parsing rules
        const { data: parsingRules } = await supabase
          .from('parsing_rules')
          .select('*')
          .eq('admin_user_id', syncState.admin_user_id)
          .eq('is_active', true)
          .order('priority', { ascending: false })

        let userSynced = 0
        let userFailed = 0

        // Process each message
        for (const message of messages) {
          try {
            // Check if already exists
            const { data: existingEmail } = await supabase
              .from('raw_emails')
              .select('id')
              .eq('gmail_message_id', message.id)
              .eq('admin_user_id', syncState.admin_user_id)
              .single()

            if (existingEmail) continue

            // Get message details
            const messageDetails = await gmailService.getMessageDetails(message.id)

            // Store raw email
            const { data: rawEmail, error: emailError } = await supabase
              .from('raw_emails')
              .insert({
                admin_user_id: syncState.admin_user_id,
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
              userFailed++
              continue
            }

            // Parse email
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
                userFailed++
                continue
              }

              // Create purchase
              const { error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                  admin_user_id: syncState.admin_user_id,
                  amount: parseResult.data.amount,
                  merchant: parseResult.data.merchant,
                  purchase_date: purchaseDate,
                  raw_email_id: rawEmail.id,
                  source: 'email',
                  description: messageDetails.subject,
                })

              if (purchaseError) {
                await supabase
                  .from('raw_emails')
                  .update({
                    parsed: true,
                    parse_error: purchaseError.message,
                    parsing_rule_id: parseResult.ruleId,
                  })
                  .eq('id', rawEmail.id)
                userFailed++
              } else {
                await supabase
                  .from('raw_emails')
                  .update({
                    parsed: true,
                    parsing_rule_id: parseResult.ruleId,
                  })
                  .eq('id', rawEmail.id)
                userSynced++
              }
            } else {
              await supabase
                .from('raw_emails')
                .update({
                  parsed: false,
                  parse_error: parseResult.error || 'No matching parsing rule found',
                })
                .eq('id', rawEmail.id)
              userFailed++
            }
          } catch (error) {
            userFailed++
          }
        }

        // Update last sync time
        await supabase
          .from('gmail_sync_state')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('admin_user_id', syncState.admin_user_id)

        totalSynced += userSynced
        totalFailed += userFailed

        results.push({
          user_id: syncState.admin_user_id,
          status: 'success',
          synced: userSynced,
          failed: userFailed,
          total: messages.length
        })
      } catch (error: any) {
        results.push({
          user_id: syncState.admin_user_id,
          status: 'error',
          error: error.message
        })
        totalFailed++
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      users_processed: syncStates.length,
      total_synced: totalSynced,
      total_failed: totalFailed,
      results
    })
  } catch (error: any) {
    console.error('Cron sync error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to sync emails',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
