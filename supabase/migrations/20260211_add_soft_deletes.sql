-- =====================================================
-- Migration: Add Soft Deletes
-- Date: 2026-02-11
-- Purpose: Add deleted_at column to prevent permanent data loss
-- =====================================================

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
-- Keep the simple approach: policies allow all operations,
-- but queries will manually filter deleted_at IS NULL

-- No policy changes needed - the application code will handle filtering
-- This is simpler and more flexible than complex RLS rules

-- Note: Soft-deleted records are still visible through RLS,
-- but the application queries filter them out with WHERE deleted_at IS NULL

-- Migration complete
-- Soft-deleted records can be restored by setting deleted_at = NULL
