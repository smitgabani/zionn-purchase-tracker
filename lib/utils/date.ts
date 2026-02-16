/**
 * Date utility functions for handling timezone-aware timestamps
 */

/**
 * Parse a date string ensuring it's treated as UTC
 * Handles timestamps with or without timezone suffix
 *
 * @param dateString - ISO date string from database (e.g., "2026-02-08T00:36:00" or "2026-02-08T00:36:00Z")
 * @returns Date object with correct UTC interpretation
 *
 * @example
 * // Without 'Z', JavaScript would interpret as local time - WRONG
 * new Date("2026-02-08T00:36:00") // Thinks: midnight in YOUR timezone
 *
 * // With 'Z', JavaScript interprets as UTC - CORRECT
 * parseUTCDate("2026-02-08T00:36:00") // Returns: midnight UTC, displays in your local timezone
 */
export function parseUTCDate(dateString: string): Date {
  if (!dateString) return new Date()

  // Check if timezone info already exists (Z, +XX:XX, or -XX:XX after time)
  const hasTimezone = dateString.includes('Z') ||
                      dateString.includes('+') ||
                      dateString.includes('-', 10) // Position 10+ to avoid matching date separators

  // If no timezone info, assume UTC by appending 'Z'
  const normalized = hasTimezone ? dateString : dateString + 'Z'

  return new Date(normalized)
}

/**
 * Check if a purchase falls within a shift's time range
 * 
 * @param purchase - Purchase object with purchase_date (TIMESTAMPTZ) and card_id
 * @param shift - Shift object with start_time, end_time, and card_id
 * @returns true if purchase was made during the shift, false otherwise
 */
export function isPurchaseInShift(
  purchase: { purchase_date: string; card_id: string },
  shift: { start_time: string; end_time: string | null; card_id: string }
): boolean {
  // Must be same card
  if (purchase.card_id !== shift.card_id) return false

  // Parse the purchase date (which is actually a TIMESTAMPTZ with time info)
  const purchaseTime = parseUTCDate(purchase.purchase_date)
  const shiftStart = parseUTCDate(shift.start_time)
  
  // If shift is ongoing (no end_time), check if purchase is after start
  if (!shift.end_time) {
    return purchaseTime >= shiftStart
  }
  
  // If shift has ended, check if purchase is between start and end
  const shiftEnd = parseUTCDate(shift.end_time)
  return purchaseTime >= shiftStart && purchaseTime <= shiftEnd
}
