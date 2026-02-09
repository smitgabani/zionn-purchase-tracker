# Timestamp Support Migration Instructions

## Overview
This migration changes `purchase_date` to store full timestamps (date + time) instead of just dates.

## What This Does
1. Changes `purchase_date` from `DATE` to `TIMESTAMPTZ` (to store both date and time)
2. Preserves all existing data (converts dates to timestamps at midnight)
3. Uses email `received_at` timestamps for accurate transaction times

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL from `supabase/migrations/20260208_add_time_support.sql`
5. Click "Run"

### Option 2: Supabase CLI
```bash
supabase db push
```

### Option 3: Direct SQL (if you have database access)
```bash
psql $DATABASE_URL < supabase/migrations/20260208_add_time_support.sql
```

## After Running the Migration

**Re-parse existing emails** (optional but recommended):
   - Go to Tools page
   - Click "Delete All Purchases" (this will reset emails)
   - Click "Quick Parse" to re-parse with accurate timestamps

## How It Works

The system now uses email `received_at` timestamps for accurate transaction times:

### For Scotiabank emails (no date in body):
- Email received: `2026-02-08T20:47:03.000Z`
- Purchase timestamp: `2026-02-08T20:47:03.000Z` ✅

### For emails with dates in body:
- Email says: "Transaction on Jan 30, 2026"
- Email received: `2026-02-08T20:47:03.000Z`
- Purchase timestamp: `2026-01-30T00:00:00.000Z` (extracted date only)

**Note:** We don't extract time from email body to avoid timezone issues (emails show "4:46 pm ET" but received_at is in UTC)

## Verify Migration Success

Run this query to check:
```sql
-- Check purchase_date type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'purchases'
AND column_name = 'purchase_date';
```

Expected result:
- `purchases.purchase_date` should be `timestamp with time zone`

## Rollback (if needed)

If something goes wrong, you can rollback:
```sql
-- Revert purchase_date back to DATE (will lose time information)
ALTER TABLE purchases ALTER COLUMN purchase_date TYPE DATE;
```

## Questions?
Check the migration file for full SQL details: `supabase/migrations/20260208_add_time_support.sql`
