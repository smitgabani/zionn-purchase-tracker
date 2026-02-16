import { google } from 'googleapis'
import { getGmailOAuth2Client } from './config'

export interface GmailLabel {
  id: string
  name: string
  type: string
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  payload?: any
  internalDate?: string
}

export interface GmailMessageDetails {
  id: string
  from: string
  subject: string
  body: string
  receivedAt: string
  snippet: string
}

export class GmailService {
  private oauth2Client: any
  private gmail: any

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = getGmailOAuth2Client()
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  // Get list of labels
  async getLabels(): Promise<GmailLabel[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      })

      return response.data.labels || []
    } catch (error) {
      console.error('Error fetching labels:', error)
      throw new Error('Failed to fetch Gmail labels')
    }
  }

  // Get messages by label
  async getMessagesByLabel(
    labelId: string,
    maxResults: number = 50,
    pageToken?: string
  ): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        maxResults,
        pageToken,
      })

      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw new Error('Failed to fetch Gmail messages')
    }
  }

  // Get ALL messages by label (with pagination)
  async getAllMessagesByLabel(labelId: string): Promise<GmailMessage[]> {
    try {
      const allMessages: GmailMessage[] = []
      let pageToken: string | undefined = undefined
      let pageCount = 0

      do {
        const response = await this.getMessagesByLabel(labelId, 100, pageToken)
        allMessages.push(...response.messages)
        pageToken = response.nextPageToken
        pageCount++
        
        console.log(`Fetched page ${pageCount}, total messages so far: ${allMessages.length}`)
      } while (pageToken)

      console.log(`Complete sync: fetched ${allMessages.length} messages across ${pageCount} pages`)
      return allMessages
    } catch (error) {
      console.error('Error fetching all messages:', error)
      throw new Error('Failed to fetch all Gmail messages')
    }
  }

  // Get message details
  async getMessageDetails(messageId: string): Promise<GmailMessageDetails> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })

      const message = response.data
      const headers = message.payload?.headers || []

      // Extract headers
      const getHeader = (name: string) => {
        const header = headers.find(
          (h: any) => h.name.toLowerCase() === name.toLowerCase()
        )
        return header?.value || ''
      }

      const from = getHeader('From')
      const subject = getHeader('Subject')
      const receivedAt = message.internalDate
        ? new Date(parseInt(message.internalDate)).toISOString()
        : new Date().toISOString()

      // Extract body
      let body = ''
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
      } else if (message.payload?.parts) {
        // Handle multipart messages
        const textPart = message.payload.parts.find(
          (part: any) => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        )
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
        }
      }

      return {
        id: message.id,
        from,
        subject,
        body,
        receivedAt,
        snippet: message.snippet || '',
      }
    } catch (error) {
      console.error('Error fetching message details:', error)
      throw new Error('Failed to fetch message details')
    }
  }

  // Get new tokens (refresh access token)
  async refreshAccessToken(): Promise<{ access_token: string; expiry_date: number }> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      return {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      }
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  // Watch for new emails (for future webhook implementation)
  async watchMailbox(labelId: string, topicName: string): Promise<any> {
    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: [labelId],
          topicName,
        },
      })

      return response.data
    } catch (error) {
      console.error('Error setting up watch:', error)
      throw new Error('Failed to set up mailbox watch')
    }
  }
}
