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

/**
 * Gets the business day range based on shift hours (9:00 AM - 4:30 AM next day)
 * If current time is before 4:30 AM, we're still in yesterday's shift day
 * 
 * @param referenceDate - The date to calculate shift day for (defaults to now)
 * @returns Object with shiftStart and shiftEnd Date objects
 * 
 * @example
 * // At Feb 16, 2:00 PM
 * getShiftDayRange() // { shiftStart: Feb 16 9:00 AM, shiftEnd: Feb 17 4:30 AM }
 * 
 * // At Feb 17, 2:00 AM (before 4:30 AM)
 * getShiftDayRange() // { shiftStart: Feb 16 9:00 AM, shiftEnd: Feb 17 4:30 AM }
 * 
 * // At Feb 17, 5:00 AM (after 4:30 AM)
 * getShiftDayRange() // { shiftStart: Feb 17 9:00 AM, shiftEnd: Feb 18 4:30 AM }
 */
export function getShiftDayRange(referenceDate: Date = new Date()) {
  const shiftStart = new Date(referenceDate)
  const shiftEnd = new Date(referenceDate)
  
  const currentHour = referenceDate.getHours()
  const currentMinute = referenceDate.getMinutes()
  
  // If current time is before 4:30 AM, shift day started yesterday at 9 AM
  if (currentHour < 4 || (currentHour === 4 && currentMinute < 30)) {
    // Shift started yesterday at 9:00 AM
    shiftStart.setDate(shiftStart.getDate() - 1)
    shiftStart.setHours(9, 0, 0, 0)
    
    // Shift ends today at 4:30 AM
    shiftEnd.setHours(4, 30, 0, 0)
  } else {
    // Shift started today at 9:00 AM
    shiftStart.setHours(9, 0, 0, 0)
    
    // Shift ends tomorrow at 4:30 AM
    shiftEnd.setDate(shiftEnd.getDate() + 1)
    shiftEnd.setHours(4, 30, 0, 0)
  }
  
  return { shiftStart, shiftEnd }
}

/**
 * Checks if a date falls within the current shift day (9:00 AM - 4:30 AM cycle)
 * 
 * @param date - Date to check (can be Date object or ISO string)
 * @returns true if date is within current shift day, false otherwise
 * 
 * @example
 * // Current time: Feb 16, 2:00 PM
 * isInCurrentShiftDay(new Date('2026-02-16T14:00:00')) // true
 * isInCurrentShiftDay(new Date('2026-02-16T08:00:00')) // false (before 9 AM)
 * isInCurrentShiftDay(new Date('2026-02-17T02:00:00')) // true (within cycle)
 */
export function isInCurrentShiftDay(date: Date | string): boolean {
  const checkDate = typeof date === 'string' ? parseUTCDate(date) : date
  const { shiftStart, shiftEnd } = getShiftDayRange()
  
  return checkDate >= shiftStart && checkDate < shiftEnd
}
