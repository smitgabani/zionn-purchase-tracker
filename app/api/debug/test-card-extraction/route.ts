import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmailParser } from '@/lib/parser/engine'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get one recent unparsed or parsed email
    const { data: emails, error: emailsError } = await supabase
      .from('raw_emails')
      .select('*')
      .eq('admin_user_id', user.id)
      .order('received_at', { ascending: false })
      .limit(5)

    if (emailsError || !emails || emails.length === 0) {
      return NextResponse.json({ error: 'No emails found' }, { status: 404 })
    }

    // Get parsing rules
    const { data: rules, error: rulesError } = await supabase
      .from('parsing_rules')
      .select('*')
      .eq('admin_user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (rulesError || !rules || rules.length === 0) {
      return NextResponse.json({ error: 'No parsing rules found' }, { status: 404 })
    }

    // Get all cards for comparison
    const { data: cards } = await supabase
      .from('cards')
      .select('id, last_four, is_active')
      .eq('is_active', true)

    const parser = new EmailParser(rules)
    const results = []

    for (const email of emails) {
      const emailText = `${email.subject || ''}\n${email.body || ''}`
      const result = parser.parse(email)

      let cardLookupResult = null
      if (result.success && result.data?.card_last_four) {
        const matchingCard = cards?.find(c => c.last_four === result.data!.card_last_four)
        cardLookupResult = {
          extracted: result.data.card_last_four,
          foundInDatabase: matchingCard ? true : false,
          matchingCard: matchingCard || null
        }
      }

      results.push({
        emailId: email.id,
        subject: email.subject,
        receivedAt: email.received_at,
        bodyPreview: emailText.substring(0, 300),
        parseSuccess: result.success,
        extractedData: result.data || null,
        cardLookup: cardLookupResult,
        ruleUsed: result.ruleId || null,
        error: result.error || null
      })
    }

    return NextResponse.json({
      message: 'Card extraction test',
      testedEmails: results.length,
      results,
      availableCards: cards?.map(c => c.last_four) || []
    })

  } catch (error: any) {
    console.error('Error testing card extraction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to test card extraction' },
      { status: 500 }
    )
  }
}
