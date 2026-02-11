# Database Migrations

This folder contains SQL migrations for the PurchaseTracker database.

## How to Run Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL from the migration file
5. Click **Run** to execute

## Available Migrations

### `add-soft-deletes.sql`
**Purpose:** Add soft delete functionality to prevent permanent data loss

**What it does:**
- Adds `deleted_at` column to purchases, employees, card_shifts, and cards tables
- Creates indexes for better query performance
- Updates RLS policies to exclude soft-deleted records

**When to run:** Before deploying the soft delete feature

**Rollback:** If needed, you can remove the columns:
```sql
ALTER TABLE purchases DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE employees DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE card_shifts DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE cards DROP COLUMN IF EXISTS deleted_at;
```

## Best Practices

- Always backup your database before running migrations
- Test migrations on a staging/development database first
- Run migrations during low-traffic periods
- Keep track of which migrations have been applied
