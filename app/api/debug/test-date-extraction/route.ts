import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmailParser } from '@/lib/parser/engine'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get a sample of recent emails
    const { data: emails, error: emailsError } = await supabase
      .from('raw_emails')
      .select('*')
      .eq('admin_user_id', user.id)
      .order('received_at', { ascending: false })
      .limit(5)

    if (emailsError) throw emailsError

    // Get parsing rules
    const { data: rules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('admin_user_id', user.id)
      .eq('is_active', true)

    if (rulesError) throw rulesError

    if (!rules || rules.length === 0) {
      return NextResponse.json({
        error: 'No active parsing rules found',
      }, { status: 400 })
    }

    // Initialize parser
    const parser = new EmailParser(rules)

    // Test parsing on each email
    const results = emails?.map(email => {
      const parseResult = parser.parse(email)

      return {
        emailId: email.id,
        sender: email.sender,
        subject: email.subject,
        receivedAt: email.received_at,
        bodyPreview: email.body?.substring(0, 500) + '...',
        parseResult: {
          success: parseResult.success,
          extractedDate: parseResult.data?.purchase_date || null,
          extractedAmount: parseResult.data?.amount || null,
          extractedMerchant: parseResult.data?.merchant || null,
          error: parseResult.error || null,
        },
        dateAnalysis: {
          extractedDateFromBody: parseResult.data?.purchase_date,
          emailReceivedDate: email.received_at ? email.received_at.split('T')[0] : null,
          wouldUse: parseResult.data?.purchase_date || (email.received_at ? email.received_at.split('T')[0] : 'NONE - WOULD FAIL'),
        },
        activeRule: rules.find(r => r.id === parseResult.ruleId),
      }
    }) || []

    return NextResponse.json({
      success: true,
      emailsAnalyzed: results.length,
      activeRules: rules.map(r => ({
        id: r.id,
        name: r.name,
        datePattern: r.date_pattern,
        dateFormat: r.date_format,
      })),
      results,
      message: 'Date extraction test complete',
    })
  } catch (error: any) {
    console.error('Error testing date extraction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to test date extraction' },
      { status: 500 }
    )
  }
}
