-- Add order_number column to purchases table
-- Migration: Add order number field for tracking purchase orders

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS order_number VARCHAR(6);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_order_number ON purchases(order_number);

-- Add comment
COMMENT ON COLUMN purchases.order_number IS 'Optional 6-digit order number for purchase tracking';
