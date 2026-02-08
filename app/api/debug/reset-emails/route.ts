import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all emails as unparsed
    const { error: resetError } = await supabase
      .from('raw_emails')
      .update({
        parsed: false,
        parse_error: null,
        parsing_rule_id: null,
      })
      .eq('admin_user_id', user.id)

    if (resetError) throw resetError

    return NextResponse.json({
      message: 'All emails marked as unparsed',
      success: true,
    })
  } catch (error: any) {
    console.error('Error resetting emails:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset emails' },
      { status: 500 }
    )
  }
}
