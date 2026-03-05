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

    const { purchaseIds } = await request.json()

    if (!purchaseIds || !Array.isArray(purchaseIds) || purchaseIds.length === 0) {
      return NextResponse.json({ error: 'Purchase IDs required' }, { status: 400 })
    }

    // Delete the duplicate purchases
    // First verify they belong to the current user
    const { data: purchasesToDelete, error: fetchError } = await supabase
      .from('purchases')
      .select('id, merchant, amount, raw_email_id')
      .in('id', purchaseIds)
      .eq('admin_user_id', user.id)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!purchasesToDelete || purchasesToDelete.length === 0) {
      return NextResponse.json({ error: 'No purchases found to delete' }, { status: 404 })
    }

    // Perform the deletion
    const { error: deleteError } = await supabase
      .from('purchases')
      .delete()
      .in('id', purchaseIds)
      .eq('admin_user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedCount: purchasesToDelete.length,
      deletedPurchases: purchasesToDelete,
    })
  } catch (error: any) {
    console.error('Delete duplicates error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete duplicates' },
      { status: 500 }
    )
  }
}
