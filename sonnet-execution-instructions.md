# CLAUDE SONNET EXECUTION INSTRUCTIONS
## PurchaseTracker Architectural Improvement Implementation

**System Context:** Next.js 16 purchase tracking app, 1-5 users, <100 purchases/day
**Execution Mode:** Structured, phase-based implementation with anti-over-engineering controls
**Source:** architectural-improvement-plan.md

---

## CORE EXECUTION PRINCIPLES

### Mandatory Constraints

1. **SIMPLICITY FIRST** - Reject complexity. If a solution requires >4 hours or external paid services, challenge necessity.
2. **SCOPE AWARENESS** - Remember: 1-5 users, not 10,000. Performance optimizations for scale are prohibited.
3. **COST CONSCIOUSNESS** - No solutions requiring monthly fees. Use free tiers only.
4. **YAGNI ENFORCEMENT** - Defer anything not immediately needed. Question all "future-proofing."

### Prohibited Actions

❌ NEVER implement: React Query, Upstash/Redis rate limiting, Sentry, server component splitting, bundle optimization, horizontal scaling patterns
❌ NEVER suggest: Monitoring tools with fees, sophisticated caching, microservices, event sourcing, queue systems
❌ NEVER optimize: Bundle size (<300KB acceptable), Time to Interactive (<4s acceptable), concurrent user handling

---

## PHASE 1: CRITICAL FIXES (WEEK 1 - 5 HOURS MAX)

**Objective:** Fix safety issues that could cause data loss or runtime failures
**Success Criteria:** All tasks complete, build passes, no new errors introduced

### Task 1.1: Environment Variable Validation (1 hour)

**Execute:**
```typescript
// Create lib/env.ts
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

export function validateEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

export function getEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Env var ${key} not set`)
  return value
}
```

**Update lib/supabase/client.ts:**
```typescript
import { getEnv } from '@/lib/env'

export function createClient() {
  return createBrowserClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
}
```

**Update app/layout.tsx:**
```typescript
import { validateEnv } from '@/lib/env'
if (typeof window === 'undefined') validateEnv()
```

**Guardrails:**
- Only call validateEnv() server-side (check `typeof window === 'undefined'`)
- Use getEnv() for all environment variable access
- Keep error messages clear and actionable

**Success Check:**
- App crashes at build time if env vars missing (good)
- Clear error message tells developer exactly what's missing
- No runtime crashes from undefined env vars

---

### Task 1.2: Cleanup Backup Files (15 minutes)

**Execute Shell Commands:**
```bash
cd /Users/smitgabani/Data/Data/Desk/projects/purchase-tracker

# Remove all backup files
find . -name "*.bak*" -type f -delete
find . -name "*.backup" -type f -delete
find . -name "*.bkp*" -type f -delete
find . -name "*.clean" -type f -delete
find . -name "*.exp*" -type f -delete
find . -name "*.export*" -type f -delete

# Update .gitignore
cat >> .gitignore << 'EOF'

# Backup files (prevent future pollution)
*.bak*
*.backup
*.bkp*
*.old
*.clean
*.exp*
*.export*
*~
EOF

# Commit changes
git add -A
git commit -m "chore: remove 27 backup files and update .gitignore"
```

**Guardrails:**
- Verify files are truly backups before deletion (check file list first)
- Ensure .gitignore syntax is correct
- Don't delete legitimate .export files if they're part of actual features

**Success Check:**
- 27 files deleted
- .gitignore prevents future backups
- Git repository size reduced
- No legitimate files deleted

---

### Task 1.3: Document CRON_SECRET (15 minutes)

**Update .env.example:**
```bash
# Add CRON_SECRET documentation
cat >> .env.example << 'EOF'

# CRON JOB AUTHENTICATION
# Required for /api/cron/sync-gmail endpoint
# Generate with: openssl rand -base64 32
CRON_SECRET=your-secret-here-replace-with-actual-secret
EOF
```

**Update app/api/cron/sync-gmail/route.ts:**
```typescript
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... rest of cron logic
}
```

**Success Check:**
- .env.example includes CRON_SECRET with generation instructions
- Cron route validates secret exists before checking
- Clear error messages for misconfiguration

---

### Task 1.4: Add Error Boundaries (2 hours)

**Create components/ErrorBoundary.tsx:**
```typescript
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: undefined }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try Again
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Update app/layout.tsx:**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <StoreProvider>
            <AuthProvider>
              <Toaster />
              {children}
            </AuthProvider>
          </StoreProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

**Update app/(dashboard)/layout.tsx:**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
```

**Guardrails:**
- Error boundaries don't catch async errors (those need try/catch in components)
- Error boundaries don't catch errors in event handlers (add try/catch there)
- Keep fallback UI simple and user-friendly
- Log errors for debugging but don't expose sensitive data

**Success Check:**
- Throw test error in component - see fallback UI instead of white screen
- Click "Try Again" resets error state
- Error logged to console for debugging
- No sensitive data exposed in error message

---

### Task 1.5: Remove Console.logs (1 hour)

**Create lib/logger.ts:**
```typescript
const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args)
  },

  error: (...args: any[]) => {
    console.error(...args)
  },

  warn: (...args: any[]) => {
    if (isDev) console.warn(...args)
  },
}
```

**Execute Shell Commands:**
```bash
# Replace console.log with logger.log in all TypeScript files
find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's/console\.log/logger.log/g' {} +

# Keep console.error as-is (or replace with logger.error if preferred)
# Manual step: Add import { logger } from '@/lib/logger' to affected files
```

**Manual Cleanup Required:**
- Add `import { logger } from '@/lib/logger'` to files using logger
- Verify build passes
- Test that logs still appear in development
- Verify logs don't appear in production

**Guardrails:**
- Don't remove console.error - those are important for production debugging
- Don't auto-add imports (sed can't do this reliably) - do manually
- Test in both dev and production mode

**Success Check:**
- `logger.log()` appears in dev console
- `logger.log()` does NOT appear in production console (verify with `NODE_ENV=production npm run dev`)
- Build passes without errors
- All files with logger have proper import

---

### PHASE 1 COMPLETION CRITERIA

✅ All 5 tasks completed
✅ Production build passes (`npm run build`)
✅ No TypeScript errors
✅ No new runtime errors
✅ Git commits made for each task
✅ Total time: ≤5 hours

**If Phase 1 takes >5 hours:** Stop and reassess. Something is wrong. Ask for guidance.

---

## PHASE 2: CODE QUALITY (MONTH 1 - 10 HOURS MAX)

**Objective:** Improve maintainability and prevent data loss
**Success Criteria:** Input validated, soft deletes implemented, error handling consistent

### Task 2.1: Add Input Validation (3 hours)

**Install Zod:**
```bash
npm install zod
```

**Create lib/validation/schemas.ts:**
```typescript
import { z } from 'zod'

export const createPurchaseSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(999999),
  merchant: z.string().max(255).optional(),
  purchase_date: z.string().datetime(),
  card_id: z.string().uuid().optional(),
  order_number: z.string().length(6).regex(/^\d+$/, 'Must be 6 digits').optional(),
  reviewed_by_initials: z.string().max(10).optional(),
})

export const updatePurchaseSchema = createPurchaseSchema.partial()

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  is_active: z.boolean().optional().default(true),
})

export const updateEmployeeSchema = createEmployeeSchema.partial()

export const createCardSchema = z.object({
  last_four: z.string().length(4).regex(/^\d{4}$/, 'Must be 4 digits'),
  bank_name: z.string().min(1).max(100),
  nickname: z.string().max(50).optional(),
  is_active: z.boolean().optional().default(true),
})

export const updateCardSchema = createCardSchema.partial()
```

**Create lib/middleware/validate.ts:**
```typescript
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

export async function validateBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        response: NextResponse.json({
          error: 'Validation failed',
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        }, { status: 400 })
      }
    }

    return {
      success: false,
      response: NextResponse.json({
        error: 'Invalid request body'
      }, { status: 400 })
    }
  }
}
```

**Update Critical API Routes:**

Example for purchases:
```typescript
// app/api/purchases/route.ts
import { validateBody } from '@/lib/middleware/validate'
import { createPurchaseSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, createPurchaseSchema)
  if (!validation.success) return validation.response

  const purchaseData = validation.data

  // Now safe to use - guaranteed valid
  const { data, error } = await supabase
    .from('purchases')
    .insert(purchaseData)

  // ...
}
```

**Apply to These Routes:**
- `app/api/purchases/route.ts` (POST)
- `app/api/employees/route.ts` (POST)
- `app/api/cards/route.ts` (POST)
- Any other user-facing creation endpoints

**Guardrails:**
- Only validate user input (POST/PUT), not GET requests
- Don't over-validate - only essential fields
- Provide clear error messages
- Don't break existing functionality

**Success Check:**
- Send invalid data → get clear error message with field names
- Send valid data → works as before
- Type safety improved (TypeScript knows data is valid)
- Build passes

---

### Task 2.2: Implement Soft Deletes (4 hours)

**Create Migration Script (manual SQL in Supabase):**
```sql
-- Add deleted_at column to critical tables
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE card_shifts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON purchases(deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_deleted ON employees(deleted_at);
CREATE INDEX IF NOT EXISTS idx_card_shifts_deleted ON card_shifts(deleted_at);

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Users see own purchases" ON purchases;
CREATE POLICY "Users see own purchases"
ON purchases FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users see own employees" ON employees;
CREATE POLICY "Users see own employees"
ON employees FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users see own card_shifts" ON card_shifts;
CREATE POLICY "Users see own card_shifts"
ON card_shifts FOR SELECT
USING (auth.uid() = admin_user_id AND deleted_at IS NULL);
```

**Update Delete Functions:**

Example for purchases:
```typescript
// Instead of hard delete:
// const { error } = await supabase.from('purchases').delete().eq('id', id)

// Soft delete:
const { error } = await supabase
  .from('purchases')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', purchaseId)
  .eq('admin_user_id', user.id) // Security: only delete own records
```

**Files to Update:**
- Purchases delete function
- Employees delete function
- Shifts delete function
- Bulk delete operations

**Add Restore Functionality (Optional but Recommended):**
```typescript
// Add to appropriate API route or component
async function restorePurchase(purchaseId: string) {
  const { error } = await supabase
    .from('purchases')
    .update({ deleted_at: null })
    .eq('id', purchaseId)
}
```

**Guardrails:**
- Test RLS policies after update (ensure deleted records don't appear)
- Update ALL queries to filter by `deleted_at IS NULL` if not using RLS
- Add confirmation dialogs for bulk deletes
- Keep soft-deleted records for 90 days, then hard delete (set up later)

**Success Check:**
- Delete purchase → still in database with deleted_at timestamp
- Deleted purchase doesn't appear in UI
- Can restore deleted purchase
- RLS prevents seeing deleted records from other users

---

### Task 2.3: Centralize Error Handling (2 hours)

**Create lib/error-handler.ts:**
```typescript
import { toast } from 'sonner'

export function handleError(error: unknown, userMessage: string) {
  // Log for debugging (only in dev)
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', userMessage, error)
  }

  // Always log errors in production (shows up in Vercel logs)
  if (process.env.NODE_ENV === 'production') {
    console.error('[PROD ERROR]', {
      message: userMessage,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  }

  // Show user-friendly message
  toast.error(userMessage)

  // Return structured error for programmatic handling
  return {
    userMessage,
    technicalError: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  }
}

// Wrapper for async operations
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    handleError(error, errorMessage)
    return null
  }
}
```

**Update Existing Error Patterns:**

Find and replace these patterns:
```typescript
// OLD (inconsistent):
.catch(error => console.error(error))
.catch(error => toast.error('Failed'))
.catch(error => { console.error(error); toast.error('Failed') })

// NEW (consistent):
.catch(error => handleError(error, 'Failed to load purchases'))
```

**Apply to All Components:**
- Purchases page
- Employees page
- Cards page
- Dashboard page
- All API routes

**Guardrails:**
- Don't change behavior, just standardize error handling
- Keep error messages user-friendly (no technical jargon)
- Ensure errors still log to console for debugging

**Success Check:**
- All errors show toast notification
- All errors log to console (dev) or Vercel logs (prod)
- Error messages are consistent and helpful
- No duplicate error handling code

---

### Task 2.4: Document Backup Strategy (1 hour)

**Create docs/backup-restore.md:**
```markdown
# Backup & Restore Strategy

## Automatic Backups (Supabase)

Supabase Pro provides Point-in-Time Recovery for the last 7 days.

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
```

## Restore from Point-in-Time

1. Go to Supabase Dashboard
2. Navigate to Settings → Backups
3. Select the restore point (any time in last 7 days)
4. Click "Restore"
5. Confirm the action
6. Wait for restore to complete (usually 5-15 minutes)

**Warning:** This will replace ALL data with the backup. Cannot be undone.

## Restore from CSV

```bash
# Import CSV backup
psql $DATABASE_URL -c "\COPY purchases FROM 'backup-purchases.csv' CSV HEADER"
```

**Note:** This appends data. Check for duplicates.

## Testing Backups

**Quarterly Task:** Test restore procedure to verify backups work.

1. Note current row count: `SELECT COUNT(*) FROM purchases`
2. Perform point-in-time restore to 1 hour ago
3. Verify data restored correctly
4. Re-restore to current time

## Soft Delete Recovery

Since we use soft deletes, accidental deletions can be recovered:

```sql
-- See deleted records
SELECT * FROM purchases WHERE deleted_at IS NOT NULL;

-- Restore specific record
UPDATE purchases SET deleted_at = NULL WHERE id = 'purchase-id';
```

## Backup Schedule

- **Automatic:** Supabase handles this (continuous)
- **Manual CSV:** Before major migrations or schema changes
- **Test Restore:** Quarterly

## Emergency Contacts

- Supabase Support: support@supabase.io
- Documentation: https://supabase.com/docs/guides/platform/backups
```

**Success Check:**
- Documentation is clear and actionable
- Includes specific commands (not generic advice)
- Test restore procedure documented
- Covers both automatic and manual backups

---

### PHASE 2 COMPLETION CRITERIA

✅ All 4 tasks completed
✅ Input validation on critical endpoints
✅ Soft deletes implemented and tested
✅ Error handling centralized
✅ Backup documentation created
✅ Total time: ≤10 hours

---

## PHASE 3: DEFERRED IMPROVEMENTS (DO NOT IMPLEMENT NOW)

**Execution Rule:** If user requests any of these, push back and explain why it's premature.

### Explicitly Forbidden Tasks

❌ **Server Component Splitting**
- Reason: 1-second load time improvement irrelevant for 1-5 users
- When to reconsider: User complaints about speed (unlikely)

❌ **React Query Migration**
- Reason: Redux works fine, migration risk > benefit
- When to reconsider: Hiring new developer who struggles with Redux

❌ **Bundle Size Optimization**
- Reason: 280KB loads instantly on modern internet
- When to reconsider: Never at this scale

❌ **Redis/Upstash Rate Limiting**
- Reason: $10-20/month for protection against... yourself?
- When to reconsider: If building public API

❌ **Monitoring Tools (Sentry, LogRocket)**
- Reason: $50-100/month, Vercel free logs sufficient
- When to reconsider: >100 errors/month, multiple developers

❌ **Code Splitting / Dynamic Imports**
- Reason: Premature optimization
- When to reconsider: Bundle >1MB

---

## ANTI-PATTERN DETECTION

### If User Requests These, Respond With:

**"I notice you're asking for [X]. Based on your scale (1-5 users, <100 purchases/day), this would be over-engineering because [Y]. Instead, I recommend [simpler alternative]. Would you like me to explain the tradeoffs?"**

### Examples:

**User:** "Add React Query for better data fetching"
**Response:** "I notice you're asking for React Query. Based on your scale (1-5 users, <100 purchases/day), this would add complexity without meaningful benefit. Your current Redux setup works fine and is familiar. Migration would take 6+ hours with risk of bugs. Instead, I recommend keeping Redux as-is. Would you like me to explain the tradeoffs?"

**User:** "Implement rate limiting with Redis"
**Response:** "I notice you're asking for Redis rate limiting. Based on your scale (1-5 authenticated users), this would cost $10-20/month for protection against... your own users. Vercel already provides basic DDoS protection. Instead, I recommend simple in-memory rate limiting IF you're paranoid (free, 30 minutes). Would you like me to explain the tradeoffs?"

---

## QUALITY GATES

### Before Completing Any Task

1. **Simplicity Check:** Could this be simpler? If yes, simplify.
2. **Scale Check:** Does this matter for 1-5 users? If no, don't do it.
3. **Cost Check:** Does this cost money? If yes, is it essential?
4. **Time Check:** Taking longer than estimated? Stop and reassess.
5. **Build Check:** Does build still pass? If no, fix before proceeding.

### Before Declaring Phase Complete

1. Run `npm run build` - must pass
2. Test in development mode
3. Test critical user flows (create purchase, delete purchase, etc.)
4. Review git commits - are they clean and descriptive?
5. Check total time - within budget?

---

## SUCCESS METRICS

### Phase 1 Success:
- Zero environment variable runtime errors
- Zero backup files in repo
- Zero white screens of death
- Clean production console logs
- All tasks completed in ≤5 hours

### Phase 2 Success:
- Invalid input rejected with clear errors
- Accidental deletes are recoverable
- All errors handled consistently
- Backup procedure documented and tested
- All tasks completed in ≤10 hours

### Overall Success:
- System is more maintainable (not more complex)
- System is more secure (not perfectly secure)
- System is more reliable (not fault-tolerant)
- Total effort ≤15 hours
- Zero new dependencies with monthly costs

---

## ERROR RECOVERY

### If Something Goes Wrong

1. **Stop Immediately:** Don't dig deeper
2. **Revert Changes:** `git reset --hard HEAD~1` if needed
3. **Assess Impact:** What broke? Why?
4. **Simplify Approach:** Find simpler solution
5. **Ask for Help:** Don't waste hours debugging

### Common Pitfalls

**Pitfall:** "I'll just add this one optimization..."
**Recovery:** Stop. Ask: Does this matter for 1-5 users?

**Pitfall:** "This is taking longer than expected..."
**Recovery:** Stop. Reassess. Simplify or defer.

**Pitfall:** "The build broke after my changes..."
**Recovery:** Revert. Fix incrementally. Test after each change.

---

## FINAL DIRECTIVES

1. **Prioritize ruthlessly:** Only Phase 1 and Phase 2 tasks. Everything else is optional.
2. **Question complexity:** If it feels complex, it probably is. Simplify.
3. **Respect the budget:** 5 hours Phase 1, 10 hours Phase 2. No exceptions.
4. **Test continuously:** Build must pass after every task.
5. **Document decisions:** Git commits explain WHY, not just WHAT.
6. **Challenge requests:** If user asks for enterprise patterns, push back politely.
7. **Keep perspective:** This is a small tool for 1-5 people, not AWS.

**Remember: Your system is GOOD ENOUGH. Don't break it trying to make it "perfect."**

---

## COMMUNICATION PROTOCOL

### When Starting a Task
"Starting Task [X]: [Description]. Estimated time: [Y]. This task addresses [specific problem]."

### When Completing a Task
"Completed Task [X]. Time taken: [Y]. Changes: [brief list]. Next: Task [Z]."

### When Encountering Issues
"Task [X] blocked: [problem]. Options: 1) [simpler approach], 2) defer, 3) skip. Recommend: [choice] because [reason]."

### When User Requests Forbidden Pattern
"I notice you're requesting [X]. At your scale (1-5 users), this would [negative consequence]. Instead, [simpler alternative]. Proceed with [X] anyway? (not recommended)"

---

**END OF EXECUTION INSTRUCTIONS**

**Mode:** Structured, phase-based, anti-over-engineering
**Target:** 15 hours total, zero monthly costs, maximum simplicity
**Outcome:** Stable, maintainable, secure system right-sized for actual needs
