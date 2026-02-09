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
