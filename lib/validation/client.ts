import { z } from 'zod'
import { toast } from 'sonner'

/**
 * Validate data on client-side before submitting to Supabase
 * Returns validated data or null if validation fails (with toast error)
 */
export function validateOrError<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  errorPrefix: string = 'Validation failed'
): z.infer<T> | null {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      const field = firstError.path.join('.')
      const message = firstError.message
      toast.error(`${errorPrefix}: ${field ? `${field} - ` : ''}${message}`)
    } else {
      toast.error(`${errorPrefix}: Invalid data`)
    }
    return null
  }
}

/**
 * Validate data and return result object (no side effects)
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Array<{ field: string; message: string }> } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }
    }
    return {
      success: false,
      errors: [{ field: '', message: 'Invalid data' }],
    }
  }
}
