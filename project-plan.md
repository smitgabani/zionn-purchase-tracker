# Project Plan: Purchase Tracking System
## From Base to Current Functionality

**Document Version:** 1.0  
**Created:** February 19, 2026  
**Purpose:** Complete development roadmap from initial concept to production

---

## Executive Summary

This document outlines the complete development journey of the Purchase Tracking System, from initial database design to a fully-functional web application with Gmail integration, automated parsing, and comprehensive management features.

---

## Phase 1: Foundation & Core Infrastructure (Weeks 1-2)

### 1.1 Initial Database Schema
**Migration:** `20260207_initial_schema.sql`

**Objectives:**
- Set up core data models
- Establish relationships between entities
- Implement RLS (Row Level Security)

**Tables Created:**
1. **profiles** - User authentication and basic info
2. **cards** - Credit/debit card tracking
3. **employees** - Staff management
4. **categories** - Expense categorization
5. **purchases** - Core transaction records
6. **emails** - Gmail message storage
7. **parsing_rules** - Email parsing configuration
8. **merchants** - Vendor/merchant registry

**Key Features:**
- UUID primary keys for all tables
- Soft delete support (`deleted_at` timestamp)
- RLS policies for multi-tenant security
- Foreign key relationships with CASCADE deletes
- Timestamp tracking (`created_at`, `updated_at`)

**Technical Decisions:**
- PostgreSQL via Supabase
- Row-Level Security for data isolation
- Normalized schema design
- UTC timestamps for consistency

---

### 1.2 Authentication & User Management

**Implementation:**
- Supabase Auth integration
- Email/password authentication
- Session management with JWT
- Protected routes with middleware

**Files Created:**
- `lib/supabase/client.ts` - Client-side Supabase instance
- `lib/supabase/server.ts` - Server-side Supabase with cookies
- `lib/supabase/middleware.ts` - Route protection
- `middleware.ts` - Next.js middleware for auth
- `components/AuthProvider.tsx` - Auth context provider
- `components/ProtectedRoute.tsx` - Route protection wrapper

**Security Measures:**
- HTTP-only cookies for tokens
- Automatic token refresh
- Secure session handling
- PKCE flow for OAuth

---

## Phase 2: Gmail Integration (Weeks 3-4)

### 2.1 Gmail OAuth Setup
**Migration:** None (configuration-based)

**Implementation:**
- Google OAuth 2.0 integration
- Token management with refresh
- Label-based email filtering
- Incremental sync support

**Files Created:**
- `lib/gmail/config.ts` - Gmail API configuration
- `lib/gmail/service.ts` - Gmail API wrapper
- `lib/gmail/token-manager.ts` - Token refresh logic
- `app/api/auth/google/route.ts` - OAuth initiation
- `app/api/auth/google/callback/route.ts` - OAuth callback
- `app/api/auth/google/refresh/route.ts` - Token refresh endpoint

**Features:**
- Full email sync
- Incremental updates
- Label management
- Thread support
- Attachment handling

**Challenges Solved:**
- Token expiration handling
- Rate limiting compliance
- Pagination for large mailboxes
- Error recovery and retry logic

---

### 2.2 Email Sync Functionality

**API Endpoints Created:**
- `POST /api/gmail/sync` - Manual email sync
- `POST /api/gmail/sync-complete` - Full mailbox sync
- `GET /api/gmail/labels` - Fetch available labels
- `POST /api/cron/sync-gmail` - Automated sync (cron job)

**Database Storage:**
- Email metadata (subject, from, date)
- Full email body (HTML & plain text)
- Gmail message ID and thread ID
- Label associations
- Parse status tracking

**Sync Strategies:**
1. **Full Sync:** Initial mailbox download
2. **Incremental Sync:** Only new messages since last sync
3. **Label Filtering:** Sync specific labels only
4. **History-based:** Use Gmail history API for efficiency

---

## Phase 3: Email Parsing Engine (Weeks 5-6)

### 3.1 Parsing Rules System

**Implementation:**
- Regex-based pattern matching
- Multi-field extraction
- Priority-based rule ordering
- Test/validation framework

**Files Created:**
- `lib/parser/engine.ts` - Core parsing logic
- `app/api/parser/parse-emails/route.ts` - Bulk parsing endpoint
- `app/api/parser/test-rule/route.ts` - Rule testing
- `components/PatternTester.tsx` - UI for pattern testing

**Extractable Fields:**
- Merchant name
- Amount (with currency parsing)
- Purchase date/time
- Card last 4 digits
- Order number
- Transaction type

**Rule Features:**
- Regex patterns for each field
- Active/inactive toggling
- Priority ordering
- Merchant-specific rules
- Fallback patterns

---

### 3.2 Date/Time Handling
**Migration:** `20260208_add_time_support.sql`

**Problem Solved:**
- Timezone inconsistencies
- Date-only vs datetime confusion
- Local time vs UTC storage

**Implementation:**
- All dates stored as `timestamptz` (UTC)
- `parseUTCDate()` utility for consistent parsing
- Timezone-aware display formatting
- Date range filtering with proper comparisons

**Files Modified:**
- `lib/utils/date.ts` - Date utility functions
- All date display/filtering logic updated
- Server-side queries use ISO strings

**Key Functions:**
```typescript
parseUTCDate(dateString: string): Date
formatShiftDate(date: string): string
getShiftDayRange(referenceDate?: Date): { start: Date; end: Date }
isInCurrentShiftDay(dateString: string): boolean
```

---

## Phase 4: Core Features Development (Weeks 7-10)

### 4.1 Purchase Management

**UI Pages:**
- `app/(dashboard)/purchases/page.tsx` - Main purchase list
- `components/dashboard/PurchaseEditModal.tsx` - Edit dialog
- `components/purchases/PurchaseFilters.tsx` - Advanced filtering

**Features:**
- Infinite scroll pagination
- Multi-select with bulk actions
- Advanced filtering:
  - Date range
  - Card selection
  - Merchant search
  - Category filter
  - Employee assignment
- Real-time search
- Export to CSV
- Manual purchase creation
- Employee assignment
- Category assignment

**State Management:**
- Redux Toolkit for purchases state
- `lib/store/slices/purchasesSlice.ts`
- Optimistic UI updates
- Error handling

---

### 4.2 Shift Management
**Migration:** `20260208_card_shifts.sql`, `20260209_add_shift_id.sql`

**Database Changes:**
- `card_shifts` table for shift tracking
- `shift_id` field in purchases table
- Shift-based purchase filtering

**Features:**
- Start/end shift tracking
- Shift-based purchase grouping
- Real-time shift statistics
- Shift ID search
- Export shift reports
- Click-to-filter purchases

**UI Components:**
- `app/(dashboard)/shifts/page.tsx` - Shift management
- `components/dashboard/OngoingShiftCard.tsx` - Active shift card

**Calculations:**
- Purchase count per shift
- Total spending per shift
- Duration calculation
- Real-time updates for ongoing shifts

---

### 4.3 Employee Management

**Features:**
- CRUD operations for employees
- Initials assignment to purchases
- Employee-based reporting
- Active/inactive status

**Files:**
- `app/(dashboard)/employees/page.tsx`
- `lib/store/slices/employeesSlice.ts`

**Additional Migration:**
- `20260209_add_initials_field.sql` - Added initials to purchases

---

### 4.4 Card Management

**Features:**
- Add/edit/delete cards
- Last 4 digits tracking
- Card-based filtering
- Soft delete support

**Files:**
- `app/(dashboard)/cards/page.tsx`
- `lib/store/slices/cardsSlice.ts`

**Soft Delete Migration:**
- `20260211_add_soft_deletes.sql` - Added soft delete to all tables

---

### 4.5 Merchant Management
**Migration:** `20260216_create_merchants_table.sql`

**Features:**
- Merchant registry
- Automatic merchant extraction from purchases
- Merchant-based filtering
- Merchant search

**Files:**
- `app/(dashboard)/merchants/page.tsx`
- `lib/store/slices/merchantsSlice.ts`

---

### 4.6 Category Management

**Features:**
- Predefined category list
- Custom category creation
- Category-based reporting
- Color coding

**Files:**
- `app/(dashboard)/categories/page.tsx`
- `lib/store/slices/categoriesSlice.ts`
- `lib/constants/categories.ts` - Default categories

---

## Phase 5: Advanced Features (Weeks 11-12)

### 5.1 Dashboard & Analytics

**Features:**
- Active shift overview
- Today's statistics
- Recent purchases
- Quick actions
- Real-time updates

**Files:**
- `app/(dashboard)/dashboard/page.tsx`
- `components/dashboard/AlertPanel.tsx`

**Metrics Displayed:**
- Active shifts count
- Today's shift count
- Total spending (active shifts)
- Total spending (today's shifts)
- Recent purchase list

---

### 5.2 Gmail Settings Page

**Features:**
- OAuth connection status
- Connect/disconnect Gmail
- Label selection
- Sync controls
- Token refresh

**Files:**
- `app/(dashboard)/gmail-settings/page.tsx`
- `components/settings/GmailIntegration.tsx`

---

### 5.3 Parsing Rules Management

**Features:**
- Create/edit/delete rules
- Pattern testing interface
- Priority ordering
- Active/inactive toggle
- Field extraction preview

**Files:**
- `app/(dashboard)/parsing-rules/page.tsx`
- `components/PatternTester.tsx`

---

### 5.4 Developer Tools

**Features:**
- Email parse status
- Data integrity checks
- Orphaned email detection
- Debug parsing
- Test extractions
- Reset utilities

**Files:**
- `app/(dashboard)/tools/page.tsx`
- `app/api/debug/*` - Multiple debug endpoints

**Debug Endpoints:**
- `/api/debug/parse-status` - Email parsing statistics
- `/api/debug/integrity-check` - Data consistency validation
- `/api/debug/orphaned-emails` - Find unparsed emails
- `/api/debug/dry-run-parse` - Test parsing without saving
- `/api/debug/test-card-extraction` - Test card number extraction
- `/api/debug/test-date-extraction` - Test date extraction
- `/api/debug/reset-emails` - Reset parse status
- `/api/debug/delete-purchases` - Bulk delete purchases
- `/api/debug/check-parsing` - Check specific email parsing

---

## Phase 6: Optimizations & Bug Fixes (Week 13)

### 6.1 Performance Optimizations

**Implemented:**
1. **Pagination:** Server-side pagination for large datasets
2. **Infinite Scroll:** Smooth loading without page jumps
3. **Memoization:** React.useMemo for expensive calculations
4. **Debouncing:** Search input debouncing
5. **Lazy Loading:** Component code splitting
6. **Index Optimization:** Database indexes on frequently queried fields

**Files Modified:**
- All list pages (purchases, shifts, etc.)
- Redux slices with normalized state

---

### 6.2 Critical Bug Fixes

#### Bug #1: Timezone Mismatch in Filtering
**Problem:** Shift totals didn't match purchases page totals

**Root Cause:** Inconsistent use of `new Date()` vs `parseUTCDate()`

**Fix Applied:**
- Updated all date comparisons to use `parseUTCDate()`
- Fixed URL parameter parsing from shifts to purchases
- Ensured client and server use same timezone logic

**Files Fixed:**
- `app/(dashboard)/shifts/page.tsx` - Lines 331-333
- `app/(dashboard)/purchases/page.tsx` - Lines 134, 137, 251-252

---

#### Bug #2: Infinite Loading Loop
**Problem:** "Loading more purchases..." shown indefinitely when filters return 0 results

**Root Cause:** `hasMore` state only tracked server pagination, not client-side filtering

**Fix Applied:**
- Created `effectiveHasMore` computed value
- Returns `false` when client filters eliminate all results
- Updated IntersectionObserver to use smart hasMore logic

**Files Fixed:**
- `app/(dashboard)/purchases/page.tsx` - Lines 173-185, 220

---

#### Bug #3: Stuck Loading State
**Problem:** "Loading more..." never disappears after successful fetch

**Root Cause:** `setLoadingMore(false)` only called in error handler, not success path

**Fix Applied:**
- Added `setLoadingMore(false)` after successful fetch when appending
- Proper loading state cleanup

**Files Fixed:**
- `app/(dashboard)/purchases/page.tsx` - Lines 347-349

---

### 6.3 UI/UX Improvements

**Implemented:**
1. **Better Error Messages:** User-friendly error displays
2. **Loading States:** Proper loading indicators
3. **Empty States:** Helpful messages when no data
4. **Confirmation Dialogs:** Prevent accidental deletions
5. **Toast Notifications:** Success/error feedback
6. **Responsive Design:** Mobile-friendly layouts

**Components:**
- `components/ui/*` - shadcn/ui components
- Toast notifications via Sonner
- Error boundaries for graceful failures

---

## Phase 7: Testing & Deployment (Week 14)

### 7.1 Testing Strategy

**Manual Testing:**
- Feature testing for all CRUD operations
- Integration testing for Gmail sync
- Edge case testing (empty data, large datasets)
- Cross-browser testing
- Mobile responsiveness testing

**Data Integrity:**
- Orphaned email detection
- Purchase-email relationship validation
- Shift-purchase consistency checks

---

### 7.2 Deployment Configuration

**Platform:** Vercel

**Configuration Files:**
- `vercel.json` - Deployment settings
- `next.config.ts` - Next.js configuration
- `.env` variables for secrets

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

---

## Technology Stack Summary

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **State Management:** Redux Toolkit
- **Forms:** React Hook Form + Zod validation
- **Date Handling:** date-fns

### Backend
- **Runtime:** Node.js (Next.js API Routes)
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **API:** RESTful endpoints
- **Email Integration:** Gmail API
- **Cron Jobs:** Vercel Cron

### DevOps
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **Version Control:** Git
- **Package Manager:** pnpm

---

## Current Application State

### Features Implemented ✅
1. User authentication & authorization
2. Gmail OAuth integration
3. Email sync (manual & automated)
4. Email parsing with regex rules
5. Purchase management (CRUD)
6. Shift tracking
7. Employee management
8. Card management
9. Merchant registry
10. Category system
11. Advanced filtering
12. Bulk operations
13. CSV export
14. Real-time dashboard
15. Developer tools
16. Soft deletes
17. Data integrity checks

### Known Limitations
1. Single-user system (not multi-tenant beyond RLS)
2. Gmail-only email integration
3. Regex-based parsing (not ML)
4. Manual rule creation required
5. No mobile app
6. No offline support
7. Limited reporting/analytics
8. No budget tracking
9. No receipt image storage
10. No expense approval workflow

---

## Database Schema Overview

### Core Tables
1. **profiles** (1) → One user per system
2. **cards** (many) → Credit/debit cards
3. **employees** (many) → Staff members
4. **categories** (many) → Expense categories
5. **merchants** (many) → Vendor registry
6. **emails** (many) → Gmail messages
7. **parsing_rules** (many) → Email parsing config
8. **purchases** (many) → Transaction records
9. **card_shifts** (many) → Shift tracking

### Relationships
- **purchases.card_id** → cards.id
- **purchases.employee_id** → employees.id
- **purchases.category_id** → categories.id
- **purchases.merchant_id** → merchants.id
- **purchases.email_id** → emails.id (nullable)
- **purchases.shift_id** → card_shifts.id (nullable)
- **card_shifts.card_id** → cards.id
- **All tables.user_id** → profiles.id

---

## Migration Timeline

| Migration File | Date | Purpose |
|---------------|------|---------|
| 20260207_initial_schema.sql | Feb 7, 2026 | Initial database setup |
| 20260208_add_time_support.sql | Feb 8, 2026 | Add time fields to purchases |
| 20260208_card_shifts.sql | Feb 8, 2026 | Create shifts table |
| 20260208_fix_card_shifts_delete_policy.sql | Feb 8, 2026 | Fix RLS policy |
| 20260209_add_initials_field.sql | Feb 9, 2026 | Add employee initials |
| 20260209_add_order_number.sql | Feb 9, 2026 | Add order tracking |
| 20260209_add_shift_id.sql | Feb 9, 2026 | Link purchases to shifts |
| 20260211_add_soft_deletes.sql | Feb 11, 2026 | Implement soft deletes |
| 20260216_create_merchants_table.sql | Feb 16, 2026 | Create merchant registry |

---

## File Structure

```
pp-web-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── purchases/page.tsx
│   │   ├── shifts/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── cards/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── merchants/page.tsx
│   │   ├── emails/page.tsx
│   │   ├── parsing-rules/page.tsx
│   │   ├── gmail-settings/page.tsx
│   │   ├── settings/page.tsx
│   │   └── tools/page.tsx
│   ├── api/
│   │   ├── auth/google/
│   │   ├── gmail/
│   │   ├── parser/
│   │   ├── cron/
│   │   ├── debug/
│   │   └── admin/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── dashboard/
│   ├── purchases/
│   ├── settings/
│   └── [other components]
├── lib/
│   ├── supabase/
│   ├── gmail/
│   ├── parser/
│   ├── store/ (Redux)
│   ├── utils/
│   ├── validation/
│   └── types/
├── supabase/
│   └── migrations/
└── [config files]
```

---

## Recommended Rebuild Approach

### Phase 1: Foundation (Week 1)
1. Set up Next.js + TypeScript
2. Configure Supabase
3. Implement authentication
4. Create database schema (all tables upfront with correct types)
5. Set up Redux store structure

### Phase 2: Core Features (Weeks 2-3)
1. Build purchase management (with proper date handling from start)
2. Implement card management
3. Create employee management
4. Build category system
5. Add merchant registry

### Phase 3: Gmail Integration (Week 4)
1. Set up OAuth flow
2. Implement email sync
3. Create parsing engine (with extensible architecture)
4. Build parsing rules UI

### Phase 4: Advanced Features (Week 5)
1. Implement shift tracking
2. Create dashboard
3. Build filtering system (with proper UTC handling)
4. Add export functionality
5. Implement bulk operations

### Phase 5: Polish (Week 6)
1. Add developer tools
2. Implement soft deletes everywhere
3. Create data integrity checks
4. Build comprehensive error handling
5. Add loading states and optimizations
6. Test all edge cases

---

## Success Metrics

### Technical Metrics
- Zero critical bugs after initial testing
- < 2 second page load time
- < 500ms API response time
- 100% type safety (TypeScript)
- Zero console errors

### Functional Metrics
- Successful Gmail sync rate > 99%
- Parsing accuracy > 95%
- Zero data loss incidents
- All CRUD operations working
- Proper timezone handling globally

---

## Lessons Learned

1. **Implement date/time handling correctly from day 1**
2. **Use `timestamptz` and UTC everywhere**
3. **Create utility functions early and use consistently**
4. **Don't mix `new Date()` and `parseUTCDate()`**
5. **Test pagination edge cases thoroughly**
6. **Implement loading states from the start**
7. **Use TypeScript strictly (no `any` types)**
8. **Plan database schema completely before coding**
9. **Implement soft deletes from beginning**
10. **Create debug tools alongside features**

---

## Next Steps for Rebuild

1. Review this plan thoroughly
2. Set up clean project structure
3. Create all database tables upfront
4. Implement core utilities first (date handling, etc.)
5. Build features incrementally with testing
6. Use the mistakes document to avoid known pitfalls
7. Follow the technical analysis for architecture decisions

---

**Document End**
