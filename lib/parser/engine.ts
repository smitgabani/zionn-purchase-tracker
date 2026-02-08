import { parse, format } from 'date-fns'
import { Database } from '@/lib/types/database.types'

type ParsingRule = Database['public']['Tables']['parsing_rules']['Row']
type RawEmail = Database['public']['Tables']['raw_emails']['Row']

export interface ParsedPurchase {
  amount: number
  merchant?: string
  purchase_date?: string
  card_last_four?: string
  description?: string
}

export interface ParseResult {
  success: boolean
  data?: ParsedPurchase
  error?: string
  ruleId?: string
}

export class EmailParser {
  private rules: ParsingRule[]

  constructor(rules: ParsingRule[]) {
    // Sort by priority (highest first)
    this.rules = rules
      .filter(r => r.is_active)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Parse an email and extract purchase data
   */
  parse(email: RawEmail): ParseResult {
    // Try each rule in priority order
    for (const rule of this.rules) {
      if (this.matchesRule(email, rule)) {
        try {
          const data = this.extractData(email, rule)
          if (data) {
            return {
              success: true,
              data,
              ruleId: rule.id,
            }
          }
        } catch (error: any) {
          console.error(`Error parsing with rule ${rule.name}:`, error)
          continue // Try next rule
        }
      }
    }

    return {
      success: false,
      error: 'No matching parsing rule found',
    }
  }

  /**
   * Check if email matches rule's matching patterns
   */
  private matchesRule(email: RawEmail, rule: ParsingRule): boolean {
    // Check sender pattern
    if (rule.sender_pattern && email.sender) {
      const senderRegex = new RegExp(rule.sender_pattern, 'i')
      if (!senderRegex.test(email.sender)) {
        return false
      }
    }

    // Check subject pattern
    if (rule.subject_pattern && email.subject) {
      const subjectRegex = new RegExp(rule.subject_pattern, 'i')
      if (!subjectRegex.test(email.subject)) {
        return false
      }
    }

    // Check body pattern
    if (rule.body_pattern && email.body) {
      const bodyRegex = new RegExp(rule.body_pattern, 'i')
      if (!bodyRegex.test(email.body)) {
        return false
      }
    }

    return true
  }

  /**
   * Extract data from email using rule's extraction patterns
   */
  private extractData(email: RawEmail, rule: ParsingRule): ParsedPurchase | null {
    const emailText = `${email.subject || ''}\n${email.body || ''}`

    // Extract amount (required)
    const amount = this.extractAmount(emailText, rule.amount_pattern)
    if (amount === null) {
      return null
    }

    // Extract optional fields
    const merchant = rule.merchant_pattern
      ? this.extractField(emailText, rule.merchant_pattern)
      : undefined

    let cardLastFour = rule.card_last_four_pattern
      ? this.extractField(emailText, rule.card_last_four_pattern)
      : undefined

    // Pad card number to 4 digits if it's only 3 digits (for Scotiabank format)
    if (cardLastFour && cardLastFour.length === 3) {
      cardLastFour = '0' + cardLastFour
    }

    const purchaseDate = rule.date_pattern
      ? this.extractDate(emailText, rule.date_pattern, rule.date_format)
      : undefined

    return {
      amount,
      merchant,
      purchase_date: purchaseDate,
      card_last_four: cardLastFour,
      description: email.subject || undefined,
    }
  }

  /**
   * Extract amount from text
   */
  private extractAmount(text: string, pattern: string): number | null {
    try {
      const regex = new RegExp(pattern, 'i')
      const match = text.match(regex)

      if (!match || !match[1]) {
        return null
      }

      // Remove commas and parse as float
      const amountStr = match[1].replace(/,/g, '')
      const amount = parseFloat(amountStr)

      return isNaN(amount) ? null : amount
    } catch (error) {
      console.error('Error extracting amount:', error)
      return null
    }
  }

  /**
   * Extract a field using regex capture group
   */
  private extractField(text: string, pattern: string): string | undefined {
    try {
      const regex = new RegExp(pattern, 'i')
      const match = text.match(regex)

      if (!match) {
        return undefined
      }

      // Find first non-empty capture group
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          return match[i].trim()
        }
      }

      return undefined
    } catch (error) {
      console.error('Error extracting field:', error)
      return undefined
    }
  }

  /**
   * Extract and parse date
   */
  private extractDate(
    text: string,
    pattern: string,
    dateFormat: string
  ): string | undefined {
    try {
      const dateStr = this.extractField(text, pattern)
      if (!dateStr) {
        return undefined
      }

      // Try to parse the date
      const parsedDate = parse(dateStr, dateFormat, new Date())

      if (isNaN(parsedDate.getTime())) {
        return undefined
      }

      // Return in ISO format (YYYY-MM-DD)
      return format(parsedDate, 'yyyy-MM-dd')
    } catch (error) {
      console.error('Error extracting date:', error)
      return undefined
    }
  }

  /**
   * Test a rule against sample text
   */
  static testRule(
    sampleText: string,
    rule: ParsingRule
  ): {
    matches: boolean
    extracted?: ParsedPurchase
    error?: string
  } {
    try {
      // Create a fake email for testing
      const fakeEmail: RawEmail = {
        id: 'test',
        admin_user_id: 'test',
        gmail_message_id: 'test',
        sender: 'test@example.com',
        subject: sampleText.split('\n')[0] || '',
        body: sampleText,
        received_at: new Date().toISOString(),
        parsed: false,
        parse_error: null,
        parsing_rule_id: null,
        created_at: new Date().toISOString(),
      }

      const parser = new EmailParser([rule])
      const matches = parser.matchesRule(fakeEmail, rule)

      if (!matches) {
        return { matches: false }
      }

      const extracted = parser.extractData(fakeEmail, rule)

      return {
        matches: true,
        extracted: extracted || undefined,
      }
    } catch (error: any) {
      return {
        matches: false,
        error: error.message,
      }
    }
  }
}
