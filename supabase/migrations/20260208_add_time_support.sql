-- =====================================================
-- ADD TIMESTAMP SUPPORT TO PURCHASES
-- Migration: 20260208_add_time_support
-- =====================================================

-- Change purchase_date from DATE to TIMESTAMPTZ
-- First, create a new column with TIMESTAMPTZ type
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS purchase_datetime TIMESTAMPTZ;

-- Copy existing date data to the new column (setting time to midnight)
UPDATE purchases
SET purchase_datetime = purchase_date::TIMESTAMPTZ
WHERE purchase_datetime IS NULL AND purchase_date IS NOT NULL;

-- Drop the old date column
ALTER TABLE purchases
DROP COLUMN IF EXISTS purchase_date;

-- Rename the new column to purchase_date
ALTER TABLE purchases
RENAME COLUMN purchase_datetime TO purchase_date;

-- Make it NOT NULL and add default
ALTER TABLE purchases
ALTER COLUMN purchase_date SET NOT NULL,
ALTER COLUMN purchase_date SET DEFAULT NOW();

-- Add index on purchase_date for better query performance
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date DESC);

-- Add comment
COMMENT ON COLUMN purchases.purchase_date IS 'Date and time of the purchase transaction (uses email received_at timestamp when date extraction fails)';
