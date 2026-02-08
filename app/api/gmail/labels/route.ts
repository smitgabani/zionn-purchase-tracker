import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GmailService } from '@/lib/gmail/service'
import { getGmailSyncState } from '@/lib/gmail/token-manager'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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

    // Fetch labels from Gmail using refreshed token
    const gmailService = new GmailService(
      syncState.access_token,
      syncState.refresh_token
    )

    const labels = await gmailService.getLabels()

    // Filter to show only user labels and system labels we care about
    const filteredLabels = labels.filter((label) => {
      return (
        label.type === 'user' ||
        ['INBOX', 'STARRED', 'IMPORTANT'].includes(label.id)
      )
    })

    return NextResponse.json({ labels: filteredLabels })
  } catch (error: any) {
    console.error('Error fetching labels:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch labels' },
      { status: 500 }
    )
  }
}
