import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const issues: any = {
      purchasesWithoutEmail: [],
      orphanedEmails: [],
      duplicatePurchases: [],
      emailsWithParseErrors: [],
      inactiveRulesStillReferenced: [],
    }

    // 1. Find purchases without email reference
    const { data: purchasesWithoutEmail, error: pwoeError } = await supabase
      .from('purchases')
      .select('id, amount, merchant, purchase_date, source')
      .eq('admin_user_id', user.id)
      .is('raw_email_id', null)
      .eq('source', 'email') // Only check email-sourced purchases
      .limit(50)

    if (pwoeError) throw pwoeError
    issues.purchasesWithoutEmail = purchasesWithoutEmail || []

    // 2. Find orphaned emails (parsed but no purchase)
    const { data: allParsedEmails, error: apeError } = await supabase
      .from('raw_emails')
      .select('id, sender, subject, received_at, purchases(id)')
      .eq('admin_user_id', user.id)
      .eq('parsed', true)
      .is('parse_error', null) // Successfully parsed
      .limit(100)

    if (apeError) throw apeError

    const orphanedEmails = allParsedEmails?.filter(
      email => !email.purchases || email.purchases.length === 0
    ).map(({ purchases, ...email }) => email) || []

    issues.orphanedEmails = orphanedEmails

    // 3. Find emails with parse errors
    const { data: emailsWithErrors, error: eweError } = await supabase
      .from('raw_emails')
      .select('id, sender, subject, received_at, parse_error')
      .eq('admin_user_id', user.id)
      .eq('parsed', true)
      .not('parse_error', 'is', null)
      .limit(50)

    if (eweError) throw eweError
    issues.emailsWithParseErrors = emailsWithErrors || []

    // 4. Find duplicate purchases (same email spawning multiple purchases)
    const { data: emailsWithMultiplePurchases, error: empError } = await supabase
      .from('raw_emails')
      .select('id, sender, subject, received_at, purchases(id, amount, merchant, purchase_date)')
      .eq('admin_user_id', user.id)

    if (empError) throw empError

    const duplicates = emailsWithMultiplePurchases?.filter(
      email => email.purchases && email.purchases.length > 1
    ) || []

    issues.duplicatePurchases = duplicates

    // 5. Find inactive rules still being referenced
    const { data: inactiveRules, error: irError } = await supabase
      .from('parsing_rules')
      .select('id, name, is_active')
      .eq('admin_user_id', user.id)
      .eq('is_active', false)

    if (irError) throw irError

    if (inactiveRules && inactiveRules.length > 0) {
      for (const rule of inactiveRules) {
        const { count, error: countError } = await supabase
          .from('raw_emails')
          .select('*', { count: 'exact', head: true })
          .eq('admin_user_id', user.id)
          .eq('parsing_rule_id', rule.id)

        if (!countError && count && count > 0) {
          issues.inactiveRulesStillReferenced.push({
            ruleId: rule.id,
            ruleName: rule.name,
            emailCount: count,
          })
        }
      }
    }

    // Calculate summary
    const totalIssues =
      issues.purchasesWithoutEmail.length +
      issues.orphanedEmails.length +
      issues.duplicatePurchases.length +
      issues.emailsWithParseErrors.length +
      issues.inactiveRulesStillReferenced.length

    const hasIssues = totalIssues > 0

    return NextResponse.json({
      success: true,
      hasIssues,
      summary: {
        purchasesWithoutEmail: issues.purchasesWithoutEmail.length,
        orphanedEmails: issues.orphanedEmails.length,
        duplicatePurchases: issues.duplicatePurchases.length,
        emailsWithParseErrors: issues.emailsWithParseErrors.length,
        inactiveRulesStillReferenced: issues.inactiveRulesStillReferenced.length,
        totalIssues,
      },
      issues,
      message: hasIssues
        ? `Found ${totalIssues} integrity issue(s)`
        : 'No integrity issues found',
    })
  } catch (error: any) {
    console.error('Error checking integrity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check integrity' },
      { status: 500 }
    )
  }
}
