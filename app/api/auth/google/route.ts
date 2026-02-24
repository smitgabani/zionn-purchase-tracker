import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/gmail/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      )
    }

    // Generate OAuth URL with user ID as state
    const authUrl = getAuthorizationUrl(user.id)

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Error generating auth URL:', error)
    return NextResponse.redirect(
      new URL('/gmail-settings?error=auth_failed', request.url)
    )
  }
}
