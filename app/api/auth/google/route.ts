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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate OAuth URL with user ID as state
    const authUrl = getAuthorizationUrl(user.id)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}
