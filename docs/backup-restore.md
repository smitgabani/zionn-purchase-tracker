# Backup & Restore Strategy

## Automatic Backups (Supabase)

Supabase Pro provides **Point-in-Time Recovery** for the last 7 days.

**Access:** Supabase Dashboard → Settings → Backups

## Manual Backup

For critical data export before major changes:

```bash
# Set your database URL
export DATABASE_URL="your-supabase-connection-string"

# Export tables to CSV
psql $DATABASE_URL -c "\COPY purchases TO 'backup-purchases-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY employees TO 'backup-employees-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY cards TO 'backup-cards-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY card_shifts TO 'backup-card-shifts-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY raw_emails TO 'backup-raw-emails-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY parsing_rules TO 'backup-parsing-rules-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY categories TO 'backup-categories-$(date +%Y%m%d).csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY gmail_sync_state TO 'backup-gmail-sync-state-$(date +%Y%m%d).csv' CSV HEADER"
```

**Get your DATABASE_URL:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Copy the connection string (starts with `postgresql://`)

## Restore from Point-in-Time

1. Go to Supabase Dashboard
2. Navigate to Settings → Backups
3. Select the restore point (any time in last 7 days)
4. Click **"Restore"**
5. Confirm the action
6. Wait for restore to complete (usually 5-15 minutes)

**⚠️ Warning:** This will replace ALL data with the backup. Cannot be undone.

## Restore from CSV

```bash
# Import CSV backup
psql $DATABASE_URL -c "\COPY purchases FROM 'backup-purchases.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY employees FROM 'backup-employees.csv' CSV HEADER"
# ... repeat for other tables
```

**Note:** This appends data. Check for duplicates after import.

## Soft Delete Recovery

Since we use soft deletes, accidental deletions can be recovered:

### View Deleted Records

```sql
-- See all deleted purchases
SELECT * FROM purchases WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC;

-- See deleted employees
SELECT * FROM employees WHERE deleted_at IS NOT NULL;

-- See deleted cards
SELECT * FROM cards WHERE deleted_at IS NOT NULL;
```

### Restore Specific Record

```sql
-- Restore a purchase
UPDATE purchases SET deleted_at = NULL WHERE id = 'purchase-id-here';

-- Restore an employee
UPDATE employees SET deleted_at = NULL WHERE id = 'employee-id-here';

-- Restore a card
UPDATE cards SET deleted_at = NULL WHERE id = 'card-id-here';
```

### Bulk Restore

```sql
-- Restore all purchases deleted in the last hour
UPDATE purchases
SET deleted_at = NULL
WHERE deleted_at > NOW() - INTERVAL '1 hour';

-- Restore all deleted records from a specific employee
UPDATE purchases
SET deleted_at = NULL
WHERE employee_id = 'employee-id-here' AND deleted_at IS NOT NULL;
```

## Permanent Cleanup (Optional)

If you want to permanently delete soft-deleted records older than 90 days:

```sql
-- Hard delete old purchases
DELETE FROM purchases WHERE deleted_at < NOW() - INTERVAL '90 days';

-- Hard delete old employees
DELETE FROM employees WHERE deleted_at < NOW() - INTERVAL '90 days';

-- Hard delete old cards
DELETE FROM cards WHERE deleted_at < NOW() - INTERVAL '90 days';
```

**⚠️ Run this carefully!** These deletions are permanent.

## Testing Backups

**Quarterly Task:** Test restore procedure to verify backups work.

1. Note current row count: `SELECT COUNT(*) FROM purchases;`
2. Perform point-in-time restore to 1 hour ago
3. Verify data restored correctly
4. Re-restore to current time (or accept the 1-hour data loss for testing)

## Backup Schedule

- **Automatic:** Supabase handles this (continuous point-in-time recovery)
- **Manual CSV:** Before major migrations or schema changes
- **Test Restore:** Quarterly (every 3 months)
- **Cleanup old soft-deletes:** Optional, every 6 months

## Emergency Contacts

- **Supabase Support:** support@supabase.io
- **Documentation:** https://supabase.com/docs/guides/platform/backups

## Disaster Recovery Plan

### Scenario 1: Accidental Bulk Delete
1. Check if soft-deleted: `SELECT COUNT(*) FROM purchases WHERE deleted_at IS NOT NULL;`
2. Restore using soft delete recovery (see above)
3. If hard-deleted, use point-in-time restore

### Scenario 2: Database Corruption
1. Go to Supabase Dashboard → Settings → Backups
2. Restore to latest good backup
3. Manually re-enter any data created after backup

### Scenario 3: Bad Migration
1. If caught immediately: rollback migration SQL
2. If data corrupted: restore to pre-migration backup
3. Fix migration script and re-apply

### Scenario 4: Supabase Outage
1. Check status: https://status.supabase.com
2. Wait for Supabase to resolve (99.9% uptime SLA)
3. No action needed - data is safe
4. Consider manual CSV export for critical operations during extended outage

## Best Practices

1. ✅ **Before major changes:** Always export CSV backups first
2. ✅ **Test quarterly:** Verify restore procedure actually works
3. ✅ **Use soft deletes:** Prevent accidental permanent loss
4. ✅ **Monitor deleted_at:** Review soft-deleted records before cleanup
5. ✅ **Document changes:** Keep notes on migrations and schema changes
6. ❌ **Don't rely only on automatic backups:** Supplement with manual exports
7. ❌ **Don't skip testing:** Untested backups are not backups

## Quick Reference

| Task | Command/Location |
|------|------------------|
| View backups | Supabase Dashboard → Settings → Backups |
| Export CSV | `psql $DATABASE_URL -c "\COPY table TO 'file.csv' CSV HEADER"` |
| Restore point-in-time | Supabase Dashboard → Settings → Backups → Restore |
| View deleted records | `SELECT * FROM table WHERE deleted_at IS NOT NULL` |
| Restore deleted record | `UPDATE table SET deleted_at = NULL WHERE id = 'id'` |
| Test restore | Quarterly - restore to 1 hour ago, verify, re-restore |

---

**Last Updated:** February 2026
**Next Review:** May 2026
