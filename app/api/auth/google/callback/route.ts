import { NextRequest, NextResponse } from 'next/server'
import { getGmailOAuth2Client } from '@/lib/gmail/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the user ID
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/gmail-settings?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/gmail-settings?error=missing_parameters', request.url)
    )
  }

  try {
    // Get tokens from Google
    const oauth2Client = getGmailOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens')
    }

    // Store tokens in database
    const supabase = await createClient()
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== state) {
      throw new Error('Unauthorized')
    }

    // Calculate token expiry
    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour default

    // Upsert Gmail sync state
    const { error: dbError } = await supabase
      .from('gmail_sync_state')
      .upsert({
        admin_user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        is_connected: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'admin_user_id' })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to save tokens')
    }

    // Redirect back to settings page
    return NextResponse.redirect(
      new URL('/gmail-settings?success=true', request.url)
    )
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/gmail-settings?error=${encodeURIComponent(error.message || 'oauth_failed')}`, request.url)
    )
  }
}
