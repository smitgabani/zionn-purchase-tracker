# Development Mistakes & LLM Prevention Guide
## Critical Lessons from Purchase Tracking System Development

**Document Version:** 1.0  
**Created:** February 19, 2026  
**Purpose:** Prevent LLM assistants from repeating known mistakes during rebuild

---

## 🚨 CRITICAL RULE FOR LLM ASSISTANTS

**READ THIS FIRST BEFORE WRITING ANY CODE:**

This document contains **REAL BUGS** that were discovered in production. Every bug listed here caused actual problems for users. When rebuilding this application, you MUST:

1. ✅ Read this entire document before starting
2. ✅ Reference this document when implementing date handling
3. ✅ Reference this document when implementing filtering
4. ✅ Reference this document when implementing pagination
5. ✅ Check each mistake category before implementing related features

**DO NOT SKIP THIS DOCUMENT. IT WILL SAVE DAYS OF DEBUGGING.**

---

## Category 1: Date & Time Handling ⏰

### ❌ MISTAKE #1: Inconsistent Date Parsing

**What Went Wrong:**
```typescript
// ❌ BAD - Used in some places
const date = new Date(dateString)

// ✅ GOOD - Should be used everywhere
const date = parseUTCDate(dateString)
```

**Impact:**
- Shift totals showed $X on shift page
- Same shift showed $Y on purchases page
- Users couldn't trust the numbers
- Caused 2+ hours of debugging

**Root Cause:**
- Database stores dates as `timestamptz` (UTC)
- `new Date()` converts to local timezone
- Different parts of code used different methods
- Calculations became inconsistent

**How to Prevent:**
1. Create `parseUTCDate()` utility function FIRST
2. NEVER use `new Date()` directly with database dates
3. Use a linter rule to prevent `new Date()` with strings
4. Test with different timezones (UTC, EST, PST, etc.)

**Correct Implementation:**
```typescript
// lib/utils/date.ts
export function parseUTCDate(dateString: string): Date {
  if (!dateString) return new Date()
  
  // Ensure UTC interpretation
  if (!dateString.endsWith('Z') && !dateString.includes('+')) {
    dateString = dateString + 'Z'
  }
  
  return new Date(dateString)
}

// ALWAYS use this function when:
// - Parsing dates from database
// - Comparing dates for filtering
// - Calculating date ranges
// - Displaying dates (use with date-fns format)
```

**Testing Checklist:**
- [ ] Test with UTC timezone (GMT+0)
- [ ] Test with positive offset (GMT+10)
- [ ] Test with negative offset (GMT-8)
- [ ] Test date boundary conditions (23:59, 00:00)
- [ ] Test with shift that spans midnight

---

### ❌ MISTAKE #2: Mixed Date Types in Database

**What Went Wrong:**
```sql
-- Initial migration (WRONG)
purchase_date DATE  -- Date only, no time

-- Later migration (FIXED)
purchase_date TIMESTAMPTZ  -- Full timestamp with timezone
```

**Impact:**
- Lost time information for purchases
- Couldn't accurately filter by time ranges
- Required migration to fix
- Data loss for early records

**How to Prevent:**
1. Use `TIMESTAMPTZ` for ALL date/time fields from day 1
2. NEVER use `DATE` type unless you truly only need date
3. Plan your schema carefully before first migration
4. Consider future requirements (time-based filtering, etc.)

**Correct Schema:**
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_date TIMESTAMPTZ NOT NULL,  -- ✅ ALWAYS use TIMESTAMPTZ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### ❌ MISTAKE #3: Timezone Confusion in Filtering

**What Went Wrong:**
```typescript
// Client-side filter (WRONG)
if (filters.startDate) {
  result = result.filter(p => 
    new Date(p.purchase_date) >= filters.startDate  // ❌ Inconsistent
  )
}

// Server-side query (DIFFERENT METHOD)
if (filters.startDate) {
  query = query.gte('purchase_date', filters.startDate.toISOString())  // Different!
}
```

**Impact:**
- Client filter showed different results than server query
- Infinite loading loops
- Inconsistent totals
- User confusion

**How to Prevent:**
1. Use identical logic on client and server
2. Always convert to UTC before comparing
3. Use the same utility function everywhere
4. Test client and server filters produce identical results

**Correct Implementation:**
```typescript
// Create a shared filter function
export function isDateInRange(
  dateString: string, 
  startDate: Date | null, 
  endDate: Date | null
): boolean {
  const date = parseUTCDate(dateString)
  
  if (startDate && date < startDate) return false
  if (endDate && date > endDate) return false
  
  return true
}

// Use in client-side filter
result = result.filter(p => 
  isDateInRange(p.purchase_date, filters.startDate, filters.endDate)
)

// Use in server-side query
if (filters.startDate) {
  query = query.gte('purchase_date', filters.startDate.toISOString())
}
if (filters.endDate) {
  query = query.lte('purchase_date', filters.endDate.toISOString())
}
```

---

### ❌ MISTAKE #4: URL Parameter Date Parsing

**What Went Wrong:**
```typescript
// ❌ WRONG - Converts to local time
const startDate = searchParams.get('startDate')
const filters = {
  startDate: startDate ? new Date(startDate) : null  // ❌ Local time!
}
```

**Impact:**
- Clicking shift on page 1 showed different data on page 2
- Filters lost timezone information during navigation
- Inconsistent user experience

**Correct Implementation:**
```typescript
// ✅ CORRECT
const startDate = searchParams.get('startDate')
const filters = {
  startDate: startDate ? parseUTCDate(startDate) : null  // ✅ UTC!
}
```

---

## Category 2: Pagination & Infinite Scroll 📜

### ❌ MISTAKE #5: Infinite Loading Loop

**What Went Wrong:**
```typescript
// Observer watches for scrolling
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
      fetchMore()  // ❌ Keeps triggering even with 0 results!
    }
  })
}, [hasMore, isLoadingMore])

// hasMore is only updated by server pagination
const hasMoreData = count ? (page + 1) * PER_PAGE < count : false
dispatch(setHasMore(hasMoreData))  // ❌ Doesn't account for client filtering!
```

**Impact:**
- "Loading more purchases..." shown forever
- Failed fetch requests in console
- Poor user experience
- Wasted API calls

**Root Cause:**
- `hasMore` based only on server-side total count
- Client-side filtering can eliminate all results
- Observer sees `hasMore=true` but `filteredResults.length=0`
- Infinite loop of failed fetches

**How to Prevent:**
1. Create "effective hasMore" that considers client filtering
2. Stop observer when filtered results are empty
3. Conditionally render observer target
4. Update hasMore based on actual displayed results

**Correct Implementation:**
```typescript
// Create smart hasMore
const effectiveHasMore = useMemo(() => {
  // If client-side filtering eliminates all results, stop paginating
  if (filteredPurchases.length === 0 && purchases.length > 0) {
    return false  // Filters hiding everything
  }
  
  // Otherwise use server-side hasMore
  return hasMore
}, [hasMore, purchases.length, filteredPurchases.length])

// Use effectiveHasMore in observer
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && effectiveHasMore && !isLoadingMore) {
      fetchMore()
    }
  })
}, [effectiveHasMore, isLoadingMore])

// Only render observer target when there are results
{filteredPurchases.length > 0 && <div ref={observerTarget} />}
```

---

### ❌ MISTAKE #6: Loading State Not Cleared

**What Went Wrong:**
```typescript
// Fetch function
const fetchPurchases = async (page = 0, append = false) => {
  if (append) {
    dispatch(setLoadingMore(true))  // ✅ Set to true
  }
  
  const { data, error } = await query
  
  if (error) {
    dispatch(setLoadingMore(false))  // ✅ Cleared on error
    return
  }
  
  // ❌ NEVER CLEARED ON SUCCESS!
  dispatch(appendPurchases(data))
}
```

**Impact:**
- "Loading more..." shown forever after successful load
- Confusing UI state
- Users think it's still loading

**How to Prevent:**
1. Clear loading state in BOTH success and error paths
2. Use try/finally blocks
3. Test success and error scenarios

**Correct Implementation:**
```typescript
const fetchPurchases = async (page = 0, append = false) => {
  try {
    if (append) {
      dispatch(setLoadingMore(true))
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    dispatch(appendPurchases(data))
    
    // ✅ Clear loading state on success
    if (append) {
      dispatch(setLoadingMore(false))
    }
  } catch (error) {
    dispatch(setLoadingMore(false))
    dispatch(setError(error.message))
  }
}
```

---

### ❌ MISTAKE #7: Observer Target Always Visible

**What Went Wrong:**
```typescript
// Observer target rendered even with 0 results
return (
  <div>
    {filteredPurchases.length === 0 && <p>No purchases found</p>}
    <div ref={observerTarget} className="h-4" />  {/* ❌ Always rendered! */}
  </div>
)
```

**Impact:**
- Observer triggers even when showing "No purchases found"
- Infinite loop of failed fetches
- Console errors

**How to Prevent:**
1. Only render observer target when there are results to show
2. Use conditional rendering

**Correct Implementation:**
```typescript
return (
  <div>
    {filteredPurchases.length === 0 && <p>No purchases found</p>}
    {filteredPurchases.length > 0 && <div ref={observerTarget} className="h-4" />}
  </div>
)
```

---

## Category 3: State Management 🔄

### ❌ MISTAKE #8: Double Filtering (Client + Server)

**What Went Wrong:**
```typescript
// Fetch with server-side filters
const fetchPurchases = async () => {
  let query = supabase.from('purchases').select()
  
  if (filters.startDate) {
    query = query.gte('purchase_date', filters.startDate.toISOString())
  }
  
  const { data } = await query
  dispatch(setPurchases(data))
}

// Then ALSO filter on client
const filteredPurchases = useMemo(() => {
  let result = purchases
  
  if (filters.startDate) {
    result = result.filter(p => new Date(p.purchase_date) >= filters.startDate)
  }
  
  return result
}, [purchases, filters])
```

**Impact:**
- Filtering applied twice (unnecessary)
- Performance hit
- Confusing code
- Easy to get out of sync

**How to Prevent:**
1. Choose ONE place to filter: client OR server
2. If using server-side filtering, don't filter again on client
3. If using client-side filtering, fetch all data first

**Decision Matrix:**
- **Small datasets (<1000 items):** Client-side filtering is fine
- **Large datasets (>1000 items):** Server-side filtering required
- **Real-time updates:** Client-side filtering for responsiveness
- **Initial load:** Server-side filtering to reduce payload

**Correct Implementation (Server-side filtering):**
```typescript
const filteredPurchases = purchases  // No additional filtering!
```

**OR (Client-side filtering):**
```typescript
// Fetch ALL data without filters
const fetchPurchases = async () => {
  const { data } = await supabase
    .from('purchases')
    .select()
    .order('purchase_date', { ascending: false })
  
  dispatch(setPurchases(data))
}

// Filter on client
const filteredPurchases = useMemo(() => {
  let result = purchases
  
  if (filters.startDate) {
    result = result.filter(p => 
      parseUTCDate(p.purchase_date) >= filters.startDate
    )
  }
  
  return result
}, [purchases, filters])
```

---

### ❌ MISTAKE #9: Not Resetting Pagination on Filter Change

**What Went Wrong:**
```typescript
// User is on page 5
// User changes filter
// Still on page 5 with new filters
// Shows "page 5" results for different filter
```

**How to Prevent:**
1. Reset page to 0 when filters change
2. Clear existing results
3. Reset hasMore state

**Correct Implementation:**
```typescript
useEffect(() => {
  // When filters change, reset pagination
  dispatch(resetPurchases())  // Clear data
  fetchPurchases(0, false)     // Fetch page 0
}, [filters])
```

---

## Category 4: Type Safety 🔒

### ❌ MISTAKE #10: Using `any` Type

**What Went Wrong:**
```typescript
// ❌ Lost type safety
const handleClick = (data: any) => {
  console.log(data.purchase_date)  // No autocomplete, no error checking
}
```

**How to Prevent:**
1. NEVER use `any` type
2. Use `unknown` if you truly don't know the type
3. Generate types from database schema
4. Use strict TypeScript config

**Correct Implementation:**
```typescript
// Generate types from Supabase
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

const handleClick = (data: Purchase) => {
  console.log(data.purchase_date)  // ✅ Full type safety!
}
```

---

### ❌ MISTAKE #11: Nullable Fields Not Handled

**What Went Wrong:**
```typescript
// ❌ Crashes if employee_id is null
const employeeName = employees.find(e => e.id === purchase.employee_id).name
```

**How to Prevent:**
1. Check database schema for nullable fields
2. Use optional chaining
3. Provide defaults

**Correct Implementation:**
```typescript
// ✅ Safe
const employeeName = employees.find(e => e.id === purchase.employee_id)?.name ?? 'Unassigned'
```

---

## Category 5: Database Design 🗄️

### ❌ MISTAKE #12: Adding Columns Later

**What Went Wrong:**
- Initial schema: `purchases` table without `shift_id`
- Later: Need to track shifts
- Migration: Add `shift_id` column
- Problem: Old data has NULL shift_id

**How to Prevent:**
1. Plan schema completely upfront
2. Think about future features
3. Add nullable columns for future use
4. Document schema evolution

**Correct Approach:**
```sql
-- Include future columns from day 1
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  purchase_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  merchant TEXT NOT NULL,
  
  -- Core relationships
  card_id UUID REFERENCES cards(id),
  employee_id UUID REFERENCES employees(id),
  category_id UUID REFERENCES categories(id),
  
  -- Future features (nullable for now)
  shift_id UUID REFERENCES card_shifts(id),  -- ✅ Added upfront
  email_id UUID REFERENCES emails(id),       -- ✅ Added upfront
  order_number TEXT,                          -- ✅ Added upfront
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- ✅ Soft delete from day 1
);
```

---

### ❌ MISTAKE #13: Soft Delete Added Late

**What Went Wrong:**
- Initial design: Hard deletes with CASCADE
- Later: Need to recover deleted data
- Migration: Add `deleted_at` column
- Problem: Already deleted data is gone forever

**How to Prevent:**
1. Implement soft deletes from day 1
2. Add `deleted_at TIMESTAMPTZ` to all tables
3. Update ALL queries to filter `WHERE deleted_at IS NULL`
4. Create helper functions

**Correct Implementation:**
```sql
-- Add to all tables from start
CREATE TABLE purchases (
  -- ... other columns ...
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Helper function
CREATE FUNCTION soft_delete_purchase(purchase_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE purchases 
  SET deleted_at = NOW() 
  WHERE id = purchase_id;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Client-side helper
const fetchPurchases = () => {
  return supabase
    .from('purchases')
    .select()
    .is('deleted_at', null)  // ✅ Always filter soft-deleted
}
```

---

## Category 6: API Design 🌐

### ❌ MISTAKE #14: No Error Handling

**What Went Wrong:**
```typescript
// ❌ No try/catch
export async function GET(request: Request) {
  const { data } = await supabase.from('purchases').select()
  return Response.json(data)  // ❌ What if query fails?
}
```

**How to Prevent:**
1. Wrap ALL async code in try/catch
2. Return proper HTTP status codes
3. Log errors for debugging
4. Return user-friendly messages

**Correct Implementation:**
```typescript
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select()
    
    if (error) {
      console.error('Database error:', error)
      return Response.json(
        { error: 'Failed to fetch purchases' },
        { status: 500 }
      )
    }
    
    return Response.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### ❌ MISTAKE #15: No Request Validation

**What Went Wrong:**
```typescript
// ❌ Trust user input
export async function POST(request: Request) {
  const body = await request.json()
  await supabase.from('purchases').insert(body)  // ❌ No validation!
}
```

**How to Prevent:**
1. Use Zod for schema validation
2. Validate ALL user input
3. Sanitize data
4. Return validation errors

**Correct Implementation:**
```typescript
import { z } from 'zod'

const PurchaseSchema = z.object({
  merchant: z.string().min(1).max(255),
  amount: z.number().positive(),
  purchase_date: z.string().datetime(),
  card_id: z.string().uuid()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // ✅ Validate input
    const validatedData = PurchaseSchema.parse(body)
    
    const { data, error } = await supabase
      .from('purchases')
      .insert(validatedData)
    
    if (error) throw error
    
    return Response.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Category 7: Performance ⚡

### ❌ MISTAKE #16: No Database Indexes

**What Went Wrong:**
```sql
-- No indexes on frequently queried columns
SELECT * FROM purchases 
WHERE purchase_date >= '2026-01-01' 
AND card_id = 'xxx'
ORDER BY purchase_date DESC;
-- ❌ Slow! Table scan every time
```

**How to Prevent:**
1. Add indexes on columns used in WHERE clauses
2. Add indexes on columns used in ORDER BY
3. Add indexes on foreign keys
4. Use composite indexes for multi-column queries

**Correct Implementation:**
```sql
-- Add indexes from day 1
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_card_id ON purchases(card_id);
CREATE INDEX idx_purchases_employee_id ON purchases(employee_id);
CREATE INDEX idx_purchases_deleted_at ON purchases(deleted_at);

-- Composite index for common query
CREATE INDEX idx_purchases_card_date 
ON purchases(card_id, purchase_date DESC) 
WHERE deleted_at IS NULL;
```

---

### ❌ MISTAKE #17: Fetching Too Much Data

**What Went Wrong:**
```typescript
// ❌ Fetch everything, filter on client
const { data } = await supabase
  .from('purchases')
  .select('*, cards(*), employees(*), categories(*)')  // ❌ Huge payload!
```

**How to Prevent:**
1. Only select columns you need
2. Use pagination
3. Limit joins
4. Cache when appropriate

**Correct Implementation:**
```typescript
// ✅ Only fetch what you need
const { data } = await supabase
  .from('purchases')
  .select('id, merchant, amount, purchase_date, card_id')
  .range(start, end)
  .limit(50)
```

---

## Category 8: Security 🔒

### ❌ MISTAKE #18: Missing RLS Policies

**What Went Wrong:**
```sql
-- Table created without RLS
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL
);
-- ❌ Any user can access any data!
```

**How to Prevent:**
1. Enable RLS on ALL tables
2. Create policies for SELECT, INSERT, UPDATE, DELETE
3. Test with different users
4. Never trust client-side auth alone

**Correct Implementation:**
```sql
-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own purchases"
ON purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
ON purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases"
ON purchases FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchases"
ON purchases FOR DELETE
USING (auth.uid() = user_id);
```

---

## Category 9: Code Organization 📁

### ❌ MISTAKE #19: Duplicate Code

**What Went Wrong:**
```typescript
// Same date formatting in multiple files
// File 1
format(new Date(purchase.purchase_date), 'MMM dd, HH:mm')

// File 2
format(new Date(shift.start_time), 'MMM dd, HH:mm')

// File 3
format(new Date(email.received_at), 'MMM dd, HH:mm')
```

**How to Prevent:**
1. Create utility functions
2. DRY principle
3. Shared constants

**Correct Implementation:**
```typescript
// lib/utils/date.ts
export const DATETIME_FORMAT = 'MMM dd, HH:mm'

export function formatDateTime(dateString: string): string {
  return format(parseUTCDate(dateString), DATETIME_FORMAT)
}

// Use everywhere
formatDateTime(purchase.purchase_date)
formatDateTime(shift.start_time)
formatDateTime(email.received_at)
```

---

### ❌ MISTAKE #20: No Consistent Error Handling

**What Went Wrong:**
```typescript
// Different error handling in each component
// Component 1: console.log
// Component 2: alert()
// Component 3: toast
// Component 4: silent failure
```

**How to Prevent:**
1. Create centralized error handler
2. Use consistent error UI (toasts)
3. Log all errors
4. User-friendly messages

**Correct Implementation:**
```typescript
// lib/error-handler.ts
export function handleError(error: unknown, userMessage?: string) {
  console.error('Error:', error)
  
  const message = userMessage || 'Something went wrong'
  toast.error(message)
  
  // Could also send to error tracking service
}

// Use everywhere
try {
  await fetchData()
} catch (error) {
  handleError(error, 'Failed to load purchases')
}
```

---

## LLM-Specific Guidelines 🤖

### For LLM Assistants Rebuilding This Application:

#### ✅ DO:
1. Read this entire document before writing any code
2. Create utility functions FIRST (date handling, formatting, etc.)
3. Set up TypeScript strict mode
4. Generate types from database schema
5. Implement error handling from the start
6. Use consistent patterns throughout
7. Test edge cases (empty data, timezone boundaries, etc.)
8. Ask clarifying questions before implementing
9. Reference the PRD and Technical Analysis documents
10. Follow the Project Plan timeline

#### ❌ DON'T:
1. Use `new Date()` with database dates - use `parseUTCDate()` instead
2. Use `any` type - use proper TypeScript types
3. Skip error handling - wrap everything in try/catch
4. Forget about soft deletes - implement from day 1
5. Mix client and server filtering - choose one approach
6. Forget to clear loading states - handle both success and error
7. Skip input validation - validate all user input
8. Create tables without indexes - add indexes from start
9. Hard-code values - use constants and configuration
10. Skip testing - test all edge cases

#### 🎯 Key Implementation Order:
1. **First:** Set up database with complete schema (all columns, indexes, RLS)
2. **Second:** Create utility functions (date handling, error handling, formatting)
3. **Third:** Set up type system (generate from database, strict TypeScript)
4. **Fourth:** Implement auth and basic CRUD
5. **Fifth:** Add pagination and filtering (with proper date handling)
6. **Sixth:** Implement Gmail integration
7. **Seventh:** Add advanced features
8. **Eighth:** Polish and optimize

#### 🧪 Testing Checklist Before Marking Complete:
- [ ] Test with UTC timezone
- [ ] Test with different timezone offsets
- [ ] Test pagination with 0 results
- [ ] Test pagination with exact page size results
- [ ] Test filtering with no matches
- [ ] Test date range spanning midnight
- [ ] Test empty states
- [ ] Test error states
- [ ] Test loading states
- [ ] Test with slow network
- [ ] Test with failed API calls
- [ ] Test with invalid input
- [ ] Test soft delete and recovery
- [ ] Test RLS policies with different users

---

## Quick Reference: Common Patterns

### ✅ Date Handling Pattern
```typescript
// ALWAYS use this pattern
import { parseUTCDate } from '@/lib/utils/date'

const date = parseUTCDate(dateString)
const formatted = format(date, 'MMM dd, HH:mm')
```

### ✅ Filtering Pattern
```typescript
// Choose ONE: client or server filtering
// Server-side (for large datasets):
query = query.gte('purchase_date', startDate.toISOString())

// Client-side (for small datasets):
result.filter(p => parseUTCDate(p.purchase_date) >= startDate)
```

### ✅ Pagination Pattern
```typescript
// Smart hasMore logic
const effectiveHasMore = useMemo(() => {
  if (filteredData.length === 0 && allData.length > 0) return false
  return serverHasMore
}, [serverHasMore, filteredData.length, allData.length])
```

### ✅ Error Handling Pattern
```typescript
try {
  const { data, error } = await apiCall()
  if (error) throw error
  return data
} catch (error) {
  handleError(error, 'User-friendly message')
  return null
}
```

### ✅ Loading State Pattern
```typescript
try {
  setLoading(true)
  const result = await fetchData()
  setLoading(false)  // ✅ Clear on success
  return result
} catch (error) {
  setLoading(false)  // ✅ Clear on error
  throw error
}
```

---

## Summary: Top 10 Critical Rules

1. **Use `parseUTCDate()` for ALL database dates** - Never use `new Date()`
2. **Always use `TIMESTAMPTZ` in database** - Never use `DATE` type
3. **Implement soft deletes from day 1** - Add `deleted_at` to all tables
4. **Handle loading states properly** - Clear in both success and error paths
5. **Use effectiveHasMore for pagination** - Account for client-side filtering
6. **Validate all user input** - Use Zod schemas
7. **Enable RLS on all tables** - Security from day 1
8. **Add database indexes upfront** - Don't wait for performance problems
9. **Use strict TypeScript** - No `any` types
10. **Test timezone edge cases** - Different timezones, midnight boundaries

---

**Follow these guidelines and you'll avoid 90% of the bugs that plagued this project!**

**Document End**
