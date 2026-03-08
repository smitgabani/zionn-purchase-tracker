import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Given a cardId and purchaseDate, find the active card_shift at that time
 * and return the employee_id. Returns null if no shift is found.
 *
 * Looks up the card_shifts table for a shift where:
 * - card_id matches
 * - start_time <= purchaseDate
 * - end_time IS NULL (still active) OR end_time >= purchaseDate
 *
 * If multiple shifts match (shouldn't normally happen), takes the most recent one.
 */
export async function resolveEmployeeFromShift(
    supabase: SupabaseClient,
    cardId: string,
    purchaseDate: string
): Promise<string | null> {
    const { data: shift, error } = await supabase
        .from('card_shifts')
        .select('employee_id')
        .eq('card_id', cardId)
        .lte('start_time', purchaseDate)
        .or(`end_time.is.null,end_time.gte.${purchaseDate}`)
        .order('start_time', { ascending: false })
        .limit(1)
        .single()

    if (error || !shift) {
        return null
    }

    return shift.employee_id
}
