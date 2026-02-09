-- Replace reviewed checkbox with initials field
-- Migration: Replace is_reviewed boolean with reviewed_by_initials varchar

-- Add the new initials column
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS reviewed_by_initials VARCHAR(10);

-- Migrate existing data: if is_reviewed = true, set initials to 'DONE' as placeholder
UPDATE purchases
SET reviewed_by_initials = 'DONE'
WHERE is_reviewed = true AND reviewed_by_initials IS NULL;

-- Drop the old is_reviewed column
ALTER TABLE purchases
DROP COLUMN IF EXISTS is_reviewed;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_reviewed_initials ON purchases(reviewed_by_initials);

-- Add comment
COMMENT ON COLUMN purchases.reviewed_by_initials IS 'Initials of person who reviewed the purchase (max 10 characters)';
