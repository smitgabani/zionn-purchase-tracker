import { NextRequest, NextResponse } from 'next/server'
import { getGmailOAuth2Client } from '@/lib/gmail/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Refresh Gmail OAuth token
 * Called automatically when access token expires
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current sync state
    const { data: syncState, error: fetchError } = await supabase
      .from('gmail_sync_state')
      .select('*')
      .eq('admin_user_id', user.id)
      .single()

    if (fetchError || !syncState || !syncState.refresh_token) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 404 })
    }

    // Use refresh token to get new access token
    const oauth2Client = getGmailOAuth2Client()
    oauth2Client.setCredentials({
      refresh_token: syncState.refresh_token,
    })

    // This will automatically refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token')
    }

    // Calculate new expiry (30 days from now as a safety buffer)
    const tokenExpiry = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

    // Update database with new access token
    const { error: updateError } = await supabase
      .from('gmail_sync_state')
      .update({
        access_token: credentials.access_token,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('admin_user_id', user.id)

    if (updateError) {
      console.error('Failed to update tokens:', updateError)
      throw new Error('Failed to update tokens')
    }

    return NextResponse.json({
      success: true,
      expiry: tokenExpiry,
    })
  } catch (error: any) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
