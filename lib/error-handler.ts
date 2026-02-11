import { toast } from 'sonner'

/**
 * Centralized error handler for consistent error handling across the app
 * @param error The error that occurred
 * @param userMessage User-friendly message to display
 */
export function handleError(error: unknown, userMessage: string) {
  // Log for debugging (only in dev)
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', userMessage, error)
  }

  // Always log errors in production (shows up in Vercel logs)
  if (process.env.NODE_ENV === 'production') {
    console.error('[PROD ERROR]', {
      message: userMessage,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  }

  // Show user-friendly message
  toast.error(userMessage)

  // Return structured error for programmatic handling
  return {
    userMessage,
    technicalError: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Wrapper for async operations with automatic error handling
 * @param operation The async operation to execute
 * @param errorMessage The error message to show if operation fails
 * @returns The result of the operation, or null if it failed
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    handleError(error, errorMessage)
    return null
  }
}
