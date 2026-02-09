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
    const shouldReset = searchParams.get('reset') === 'true'

    // Get all parsed emails with their purchases
    const { data: emails, error: emailsError } = await supabase
      .from('raw_emails')
      .select('id, sender, subject, received_at, parse_error, parsing_rule_id, purchases(id)')
      .eq('admin_user_id', user.id)
      .eq('parsed', true)
      .order('received_at', { ascending: false })

    if (emailsError) throw emailsError

    // Filter to only orphaned emails (no associated purchase)
    const orphanedEmails = emails?.filter(
      email => !email.purchases || email.purchases.length === 0
    ) || []

    // If reset flag is true, mark these emails as unparsed
    let resetCount = 0
    if (shouldReset && orphanedEmails.length > 0) {
      const orphanedIds = orphanedEmails.map(e => e.id)

      const { error: resetError, count } = await supabase
        .from('raw_emails')
        .update({
          parsed: false,
          parse_error: null,
          parsing_rule_id: null,
        })
        .in('id', orphanedIds)
        .eq('admin_user_id', user.id)

      if (resetError) throw resetError
      resetCount = count || 0
    }

    // Clean up the response (remove purchases field)
    const cleanedEmails = orphanedEmails.map(({ purchases, ...email }) => email)

    return NextResponse.json({
      success: true,
      orphanedEmails: cleanedEmails,
      count: orphanedEmails.length,
      resetCount: shouldReset ? resetCount : undefined,
      message: shouldReset
        ? `Found ${orphanedEmails.length} orphaned email(s), reset ${resetCount} to unparsed`
        : `Found ${orphanedEmails.length} orphaned email(s)`,
    })
  } catch (error: any) {
    console.error('Error finding orphaned emails:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to find orphaned emails' },
      { status: 500 }
    )
  }
}
