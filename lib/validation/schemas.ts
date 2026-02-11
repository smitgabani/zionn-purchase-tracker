import { z } from 'zod'

// Purchase schemas
export const createPurchaseSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(999999),
  merchant: z.string().max(255).optional(),
  purchase_date: z.string().datetime(),
  card_id: z.string().uuid().optional(),
  order_number: z.string().length(6).regex(/^\d+$/, 'Must be 6 digits').optional(),
  reviewed_by_initials: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  source: z.enum(['email', 'manual']).optional(),
})

export const updatePurchaseSchema = createPurchaseSchema.partial()

// Employee schemas
export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  is_active: z.boolean().optional().default(true),
})

export const updateEmployeeSchema = createEmployeeSchema.partial()

// Card schemas
export const createCardSchema = z.object({
  last_four: z.string().length(4).regex(/^\d{4}$/, 'Must be 4 digits'),
  bank_name: z.string().min(1).max(100),
  nickname: z.string().max(50).optional(),
  is_active: z.boolean().optional().default(true),
})

export const updateCardSchema = createCardSchema.partial()

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
})

export const updateCategorySchema = createCategorySchema.partial()
