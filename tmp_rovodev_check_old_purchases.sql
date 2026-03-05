-- Check if there are ANY purchases before Feb 22, 2026

-- 1. Count purchases before Feb 22
SELECT COUNT(*) as total_before_feb22
FROM purchases
WHERE purchase_date < '2026-02-22';

-- 2. Show earliest purchase date
SELECT MIN(purchase_date) as earliest_purchase
FROM purchases;

-- 3. Show distribution by date
SELECT 
  DATE(purchase_date) as purchase_day,
  COUNT(*) as count,
  SUM(amount) as total,
  deleted_at IS NOT NULL as is_deleted
FROM purchases
WHERE purchase_date < '2026-02-22'
GROUP BY DATE(purchase_date), deleted_at IS NOT NULL
ORDER BY purchase_day DESC
LIMIT 20;

-- 4. Check if there's a deleted_at filter somewhere
SELECT 
  DATE(purchase_date) as date,
  COUNT(*) as total,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted
FROM purchases
WHERE purchase_date < '2026-02-22'
GROUP BY DATE(purchase_date)
ORDER BY date DESC
LIMIT 10;
