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

    // Find ALL purchases to check for duplicates
    const { data: allPurchases, error } = await supabase
      .from('purchases')
      .select(`
        raw_email_id,
        id,
        merchant,
        amount,
        purchase_date,
        created_at,
        card_id,
        employee_id,
        order_number
      `)
      .eq('admin_user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Strategy 1: Group by raw_email_id (for email-based duplicates)
    const emailGroups = new Map<string, any[]>()
    
    // Strategy 2: Group by merchant+amount+date (for data-based duplicates)
    const dataGroups = new Map<string, any[]>()
    
    allPurchases?.forEach((purchase) => {
      // Group by email ID if exists
      if (purchase.raw_email_id) {
        const emailId = purchase.raw_email_id
        if (!emailGroups.has(emailId)) {
          emailGroups.set(emailId, [])
        }
        emailGroups.get(emailId)!.push(purchase)
      }
      
      // Also group by merchant+amount+purchase_date
      // Truncate purchase_date to minute precision to catch near-simultaneous duplicates
      const purchaseDate = new Date(purchase.purchase_date)
      const dateKey = `${purchaseDate.getFullYear()}-${purchaseDate.getMonth()}-${purchaseDate.getDate()}-${purchaseDate.getHours()}-${purchaseDate.getMinutes()}`
      const dataKey = `${purchase.merchant}|${purchase.amount}|${dateKey}`
      
      if (!dataGroups.has(dataKey)) {
        dataGroups.set(dataKey, [])
      }
      dataGroups.get(dataKey)!.push(purchase)
    })

    // Find email-based duplicates
    const emailDuplicates = Array.from(emailGroups.entries())
      .filter(([_, purchases]) => purchases.length > 1)
      .map(([emailId, purchases]) => ({
        type: 'email',
        raw_email_id: emailId,
        count: purchases.length,
        purchases: purchases,
        keepPurchaseId: purchases[0].id,
        duplicatePurchaseIds: purchases.slice(1).map(p => p.id),
      }))

    // Find data-based duplicates (same merchant+amount+time)
    const dataDuplicates = Array.from(dataGroups.entries())
      .filter(([_, purchases]) => purchases.length > 1)
      .map(([dataKey, purchases]) => ({
        type: 'data',
        raw_email_id: purchases[0].raw_email_id || 'N/A (manual entry)',
        count: purchases.length,
        purchases: purchases,
        keepPurchaseId: purchases[0].id,
        duplicatePurchaseIds: purchases.slice(1).map(p => p.id),
      }))

    // Combine both types, removing duplicates (purchases already found in email groups)
    const emailPurchaseIds = new Set(
      emailDuplicates.flatMap(group => group.purchases.map(p => p.id))
    )
    
    const uniqueDataDuplicates = dataDuplicates.filter(group => 
      // Only include if these purchases weren't already caught by email duplicate detection
      !group.purchases.every(p => emailPurchaseIds.has(p.id))
    )

    const duplicates = [...emailDuplicates, ...uniqueDataDuplicates]

    const totalDuplicatePurchases = duplicates.reduce((sum, group) => 
      sum + (group.count - 1), 0
    )

    return NextResponse.json({
      duplicateEmailGroups: duplicates.length,
      totalDuplicatePurchases,
      duplicates,
    })
  } catch (error: any) {
    console.error('Find duplicates error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to find duplicates' },
      { status: 500 }
    )
  }
}
