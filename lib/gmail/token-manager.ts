/**
 * Gmail Token Manager
 * Handles automatic token refresh for both client and server contexts
 */

import { createClient as createClientBrowser } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Get valid Gmail access token with automatic refresh (Server-side)
 * Use this in API routes
 */
export async function getValidGmailTokenServer() {
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Get sync state
  const { data: syncState, error } = await supabase
    .from('gmail_sync_state')
    .select('*')
    .eq('admin_user_id', user.id)
    .single()

  if (error || !syncState) {
    throw new Error('Gmail not connected')
  }

  // Check if token is expired or will expire in next 5 minutes
  const expiryTime = new Date(syncState.token_expiry).getTime()
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  if (expiryTime - now < fiveMinutes) {
    console.log('🔄 Access token expired or expiring soon, refreshing...')
    
    // Refresh using the GmailService
    const { GmailService } = await import('@/lib/gmail/service')
    const gmailService = new GmailService(
      syncState.access_token,
      syncState.refresh_token
    )
    
    const newTokens = await gmailService.refreshAccessToken()

    // Update database with new tokens
    const { error: updateError } = await supabase
      .from('gmail_sync_state')
      .update({
        access_token: newTokens.access_token,
        token_expiry: new Date(newTokens.expiry_date).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('admin_user_id', user.id)

    if (updateError) {
      throw new Error('Failed to update refreshed tokens')
    }

    console.log('✅ Token refreshed! New expiry:', new Date(newTokens.expiry_date).toISOString())
    return newTokens.access_token
  }

  return syncState.access_token
}

/**
 * Get Gmail sync state with valid token (Server-side)
 * Returns the full sync state with refreshed token
 */
export async function getGmailSyncState() {
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Get sync state
  const { data: syncState, error } = await supabase
    .from('gmail_sync_state')
    .select('*')
    .eq('admin_user_id', user.id)
    .single()

  if (error || !syncState) {
    throw new Error('Gmail not connected')
  }

  // Check if token needs refresh
  const expiryTime = new Date(syncState.token_expiry).getTime()
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  if (expiryTime - now < fiveMinutes) {
    // Refresh token
    const validToken = await getValidGmailTokenServer()
    syncState.access_token = validToken
  }

  return syncState
}

/**
 * Get valid Gmail access token with automatic refresh (Client-side)
 * Use this in React components
 */
export async function getValidGmailToken() {
  const supabase = createClientBrowser()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get sync state
  const { data: syncState, error } = await supabase
    .from('gmail_sync_state')
    .select('*')
    .eq('admin_user_id', user.id)
    .single()

  if (error || !syncState) {
    throw new Error('Gmail not connected')
  }

  // Check if token is expired or will expire in next 5 minutes
  const expiryTime = new Date(syncState.token_expiry).getTime()
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  if (expiryTime - now < fiveMinutes) {
    console.log('🔄 Access token expired or expiring soon, refreshing...')
    
    // Refresh the token via API
    const response = await fetch('/api/auth/google/refresh', {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const { expiry } = await response.json()
    console.log('✅ Token refreshed! New expiry:', expiry)

    // Re-fetch updated sync state
    const { data: updatedState } = await supabase
      .from('gmail_sync_state')
      .select('*')
      .eq('admin_user_id', user.id)
      .single()

    return updatedState?.access_token
  }

  return syncState.access_token
}

export async function isGmailConnected() {
  try {
    const token = await getValidGmailToken()
    return !!token
  } catch {
    return false
  }
}
