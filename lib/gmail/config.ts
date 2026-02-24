import { google } from 'googleapis'

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
]

export function getGmailOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  // Use environment variable if set, otherwise construct from APP_URL
  let redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  
  // If not set, construct it from the app URL
  if (!redirectUri) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    redirectUri = `${appUrl}/api/auth/google/callback`
  }

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials. Please check your environment variables.')
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  )

  return oauth2Client
}

export function getAuthorizationUrl(state?: string) {
  const oauth2Client = getGmailOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // Force consent screen to always get refresh token
    state: state || '',
  })
}
