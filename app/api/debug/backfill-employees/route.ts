import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveEmployeeFromShift } from '@/lib/utils/shift-lookup'

export const runtime = 'nodejs'

/**
 * One-time backfill: For all purchases with employee_id = NULL and card_id != NULL,
 * look up who held that card at the purchase time via card_shifts and assign them.
 *
 * Purchases that already have an employee_id are NOT modified.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all purchases with no employee but with a card
        const { data: purchases, error: fetchError } = await supabase
            .from('purchases')
            .select('id, card_id, purchase_date')
            .eq('admin_user_id', user.id)
            .is('employee_id', null)
            .not('card_id', 'is', null)
            .is('deleted_at', null)

        if (fetchError) {
            throw new Error(`Failed to fetch purchases: ${fetchError.message}`)
        }

        if (!purchases || purchases.length === 0) {
            return NextResponse.json({
                message: 'No purchases to backfill',
                total: 0,
                updated: 0,
                noShiftFound: 0,
            })
        }

        let updated = 0
        let noShiftFound = 0
        let errors = 0

        for (const purchase of purchases) {
            try {
                const employeeId = await resolveEmployeeFromShift(
                    supabase,
                    purchase.card_id!,
                    purchase.purchase_date
                )

                if (employeeId) {
                    const { error: updateError } = await supabase
                        .from('purchases')
                        .update({ employee_id: employeeId })
                        .eq('id', purchase.id)

                    if (updateError) {
                        console.error(`Error updating purchase ${purchase.id}:`, updateError)
                        errors++
                    } else {
                        updated++
                    }
                } else {
                    noShiftFound++
                }
            } catch (error: any) {
                console.error(`Error processing purchase ${purchase.id}:`, error)
                errors++
            }
        }

        return NextResponse.json({
            message: 'Backfill complete',
            total: purchases.length,
            updated,
            noShiftFound,
            errors,
        })
    } catch (error: any) {
        console.error('Backfill error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to backfill employees' },
            { status: 500 }
        )
    }
}
