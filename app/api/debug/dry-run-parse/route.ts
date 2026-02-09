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
    const { emailId, testUnparsed } = body

    // Get parsing rules
    const { data: rules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('admin_user_id', user.id)

    if (rulesError) throw rulesError

    if (!rules || rules.length === 0) {
      return NextResponse.json({
        error: 'No parsing rules found. Create at least one active parsing rule first.',
      }, { status: 400 })
    }

    let emails: any[]

    if (testUnparsed) {
      // Test on unparsed emails
      const { data, error: emailsError } = await supabase
        .from('raw_emails')
        .select('*')
        .eq('admin_user_id', user.id)
        .eq('parsed', false)
        .order('received_at', { ascending: false })
        .limit(10)

      if (emailsError) throw emailsError
      emails = data || []
    } else if (emailId) {
      // Test on specific email
      const { data, error: emailError } = await supabase
        .from('raw_emails')
        .select('*')
        .eq('id', emailId)
        .eq('admin_user_id', user.id)
        .single()

      if (emailError) throw emailError
      emails = data ? [data] : []
    } else {
      return NextResponse.json({
        error: 'Either emailId or testUnparsed must be provided',
      }, { status: 400 })
    }

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No emails to test',
      })
    }

    // Initialize parser
    const parser = new EmailParser(rules)

    // Parse each email (dry-run - don't create purchases)
    const results = emails.map(email => {
      const parseResult = parser.parse(email)

      // Find the matching rule details
      let matchingRule = null
      if (parseResult.ruleId) {
        matchingRule = rules.find(r => r.id === parseResult.ruleId)
      }

      return {
        emailId: email.id,
        sender: email.sender,
        subject: email.subject,
        receivedAt: email.received_at,
        parseResult: {
          success: parseResult.success,
          extracted: parseResult.data || null,
          error: parseResult.error || null,
          matchingRule: matchingRule ? {
            id: matchingRule.id,
            name: matchingRule.name,
            priority: matchingRule.priority,
          } : null,
        },
      }
    })

    const successCount = results.filter(r => r.parseResult.success).length
    const failureCount = results.filter(r => !r.parseResult.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
      },
      message: `Dry-run completed: ${successCount} succeeded, ${failureCount} failed`,
      note: 'This is a dry-run. No purchases were created and no emails were marked as parsed.',
    })
  } catch (error: any) {
    console.error('Error in dry-run parse:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run dry-run parse' },
      { status: 500 }
    )
  }
}
