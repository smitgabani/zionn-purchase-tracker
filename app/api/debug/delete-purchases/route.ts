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

    // First, get all purchases with their email references
    const { data: purchasesToDelete, error: fetchError } = await supabase
      .from('purchases')
      .select('id, raw_email_id')
      .eq('admin_user_id', user.id)

    if (fetchError) throw fetchError

    // Collect unique email IDs (filter out nulls)
    const emailIds = Array.from(
      new Set(
        purchasesToDelete
          ?.map(p => p.raw_email_id)
          .filter((id): id is string => id !== null) || []
      )
    )

    // Delete all purchases for this user
    const { data, error: deleteError } = await supabase
      .from('purchases')
      .delete()
      .eq('admin_user_id', user.id)
      .select('id')

    if (deleteError) throw deleteError

    const deletedCount = data?.length || 0

    // Reset the associated emails to unparsed so they can be re-parsed
    let emailsResetCount = 0
    if (emailIds.length > 0) {
      const { error: resetError, count } = await supabase
        .from('raw_emails')
        .update({
          parsed: false,
          parse_error: null,
          parsing_rule_id: null,
        })
        .in('id', emailIds)
        .eq('admin_user_id', user.id)

      if (resetError) {
        console.error('Error resetting emails:', resetError)
        // Don't throw - purchases are already deleted
      } else {
        emailsResetCount = count || 0
      }
    }

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} purchase(s) and reset ${emailsResetCount} email(s) to unparsed`,
      success: true,
      deletedCount,
      emailsResetCount,
    })
  } catch (error: any) {
    console.error('Error deleting purchases:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete purchases' },
      { status: 500 }
    )
  }
}
