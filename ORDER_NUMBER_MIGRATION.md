# Order Number Migration Instructions

This migration adds an `order_number` field to the purchases table for tracking 6-digit order numbers.

## Steps to Run Migration

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Click on **SQL Editor** in the left sidebar

2. **Run the Migration**
   - Click **New Query**
   - Copy and paste the contents of `supabase/migrations/20260209_add_order_number.sql`
   - Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)

3. **Verify the Migration**
   - Go to **Table Editor** → **purchases** table
   - You should see a new column called `order_number` (VARCHAR(6), nullable)

## What Changed

### Database
- Added `order_number` column to `purchases` table (VARCHAR(6), nullable)
- Added index `idx_purchases_order_number` for faster lookups

### UI Changes
- Added "Order #" column to purchases table
- Inline editing: Type directly into the order number field (auto-saves, digits only, max 6)
- Add/Edit dialog: Order number field included in the form

## Usage

- Order numbers are optional and can be left blank
- Only numeric digits are allowed (0-9)
- Maximum 6 digits
- Changes save automatically when typing in the table
- Can also be set when adding or editing purchases via the dialog

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the column
ALTER TABLE purchases DROP COLUMN IF EXISTS order_number;

-- Remove the index
DROP INDEX IF EXISTS idx_purchases_order_number;
```
