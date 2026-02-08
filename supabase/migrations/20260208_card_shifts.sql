-- Create card_shifts table to track card assignment history
CREATE TABLE IF NOT EXISTS card_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_card_shifts_card_id ON card_shifts(card_id);
CREATE INDEX IF NOT EXISTS idx_card_shifts_employee_id ON card_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_card_shifts_times ON card_shifts(start_time, end_time);

-- Enable RLS
ALTER TABLE card_shifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own card shifts"
  ON card_shifts FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM cards WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own card shifts"
  ON card_shifts FOR INSERT
  WITH CHECK (
    card_id IN (
      SELECT id FROM cards WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own card shifts"
  ON card_shifts FOR UPDATE
  USING (
    card_id IN (
      SELECT id FROM cards WHERE admin_user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE card_shifts IS 'Tracks card assignment history - when cards are assigned to employees';
