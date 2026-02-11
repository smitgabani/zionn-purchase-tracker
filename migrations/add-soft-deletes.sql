-- Migration: Add Soft Deletes
-- Date: 2026-02-10
-- Purpose: Add deleted_at column to prevent permanent data loss

-- Add deleted_at column to critical tables
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE card_shifts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add indexes for performance (filtering by deleted_at)
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON purchases(deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_deleted ON employees(deleted_at);
CREATE INDEX IF NOT EXISTS idx_card_shifts_deleted ON card_shifts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_cards_deleted ON cards(deleted_at);

-- Update RLS policies to exclude soft-deleted records
-- Note: Run these in Supabase SQL Editor

-- Purchases policies
DROP POLICY IF EXISTS "Users see own purchases" ON purchases;
CREATE POLICY "Users see own purchases"
ON purchases FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users insert own purchases" ON purchases;
CREATE POLICY "Users insert own purchases"
ON purchases FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users update own purchases" ON purchases;
CREATE POLICY "Users update own purchases"
ON purchases FOR UPDATE
USING (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users delete own purchases" ON purchases;
CREATE POLICY "Users delete own purchases"
ON purchases FOR DELETE
USING (auth.uid() = admin_user_id);

-- Employees policies
DROP POLICY IF EXISTS "Users see own employees" ON employees;
CREATE POLICY "Users see own employees"
ON employees FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users insert own employees" ON employees;
CREATE POLICY "Users insert own employees"
ON employees FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users update own employees" ON employees;
CREATE POLICY "Users update own employees"
ON employees FOR UPDATE
USING (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users delete own employees" ON employees;
CREATE POLICY "Users delete own employees"
ON employees FOR DELETE
USING (auth.uid() = admin_user_id);

-- Card shifts policies
DROP POLICY IF EXISTS "Users see own card_shifts" ON card_shifts;
CREATE POLICY "Users see own card_shifts"
ON card_shifts FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users insert own card_shifts" ON card_shifts;
CREATE POLICY "Users insert own card_shifts"
ON card_shifts FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users update own card_shifts" ON card_shifts;
CREATE POLICY "Users update own card_shifts"
ON card_shifts FOR UPDATE
USING (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users delete own card_shifts" ON card_shifts;
CREATE POLICY "Users delete own card_shifts"
ON card_shifts FOR DELETE
USING (auth.uid() = admin_user_id);

-- Cards policies
DROP POLICY IF EXISTS "Users see own cards" ON cards;
CREATE POLICY "Users see own cards"
ON cards FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users insert own cards" ON cards;
CREATE POLICY "Users insert own cards"
ON cards FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users update own cards" ON cards;
CREATE POLICY "Users update own cards"
ON cards FOR UPDATE
USING (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Users delete own cards" ON cards;
CREATE POLICY "Users delete own cards"
ON cards FOR DELETE
USING (auth.uid() = admin_user_id);

-- Migration complete
-- Note: After running this migration, update application code to use soft deletes instead of hard deletes
