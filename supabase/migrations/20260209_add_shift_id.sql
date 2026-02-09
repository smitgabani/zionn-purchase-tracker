-- Add shift_id column to card_shifts table
-- This allows tracking external shift IDs for ended shifts

ALTER TABLE card_shifts
ADD COLUMN IF NOT EXISTS shift_id VARCHAR(10);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_card_shifts_shift_id ON card_shifts(shift_id);

-- Add comment
COMMENT ON COLUMN card_shifts.shift_id IS 'Optional shift ID for tracking (can be added when shift ends)';
