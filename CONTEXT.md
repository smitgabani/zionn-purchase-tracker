# PurchaseTracker - Project Context

## 🎯 Project Vision

**PurchaseTracker** is a single-admin application designed to track company card purchases through automated bank transaction email parsing.

### Core Concept

- **Single Admin User** manages everything
- **Employees** are data records (NOT user accounts with login)
- **Cards** are assigned to employees and tracked through shifts
- **Bank emails** are synced from Gmail and automatically parsed
- **Purchases** are automatically extracted from emails
- **Admin** reviews and analyzes all spending

## 🏗️ Current Architecture

### Single-Admin Model
- One admin user, employees are data entries only
- All tables have `admin_user_id` foreign key
- RLS policies scope everything to admin user
- No employee authentication needed

### Card Shifts System
- Track when cards are assigned to employees
- Start/end times for each shift
- Purchases linked to shifts by card + time range
- Automatic employee association through active shifts

### Email Processing Pipeline

**Stage 1: Email Sync**
- Fetch emails from Gmail via OAuth
- Store raw emails with full HTML content
- Track sync history and status

**Stage 2: Parsing**
- Apply regex-based parsing rules
- Extract: amount, merchant, date, card number
- Create purchases automatically
- Handle timezone-aware timestamps (UTC storage)

## 🗄️ Database Schema

### Core Tables

**employees**
- Employee records (name only, no email/department)
- Linked to cards through card_shifts

**cards**
- Company cards with last 4 digits
- Bank name, nickname, type
- Active/inactive status
- Unassigned to specific employees (shifts handle assignment)

**card_shifts**
- Tracks card assignment history
- start_time, end_time (nullable for ongoing)
- Links card → employee for time periods
- Used to calculate shift statistics

**purchases**
- Transaction records
- `purchase_date` (TIMESTAMPTZ) - actual transaction time
- `order_number` (VARCHAR(6)) - optional tracking number
- `reviewed_by_initials` (VARCHAR(10)) - reviewer initials instead of boolean
- Links to card, employee (via shifts)
- Auto-created from parsed emails

**parsing_rules**
- Regex patterns for email parsing
- Match criteria (sender, subject, body)
- Extraction patterns (amount, merchant, card, date)
- Priority system for rule ordering
- Active/inactive status

**raw_emails**
- Synced Gmail messages
- Full HTML body preserved
- Parsing status and errors
- Gmail message ID for deduplication

## 📊 Key Features Implemented

### ✅ Phase 1-4: Complete
- Admin authentication with Google OAuth
- Full CRUD: Employees, Cards, Categories, Purchases
- Gmail integration with auto-sync
- Card shifts tracking with start/end times
- Email parsing engine with regex rules
- Automatic purchase creation from emails
- Parsing Rules management UI
- Developer Tools for debugging

### Current Functionality

**Purchases Page**
- Sortable table by purchase_date
- Inline editable order numbers (6 digits)
- Inline editable initials (10 chars max)
- Card filter, date range filter
- Source filter (Email/Manual)
- Reviewed status filter (based on initials presence)
- CSV export functionality
- No employee or source columns

**Shifts Page**
- Track card assignments to employees
- Calculate purchases and spending per shift
- Click shift to filter purchases
- Ongoing shifts show current totals
- Duration tracking

**Parsing Rules Page**
- Create/edit/delete parsing rules
- Test rules with sample text
- Priority ordering
- Card extraction patterns for various formats

**Tools Page**
- Quick Parse (normal operation)
- Smart Full Parse (re-parse orphaned emails)
- Full Re-parse with duplicate checking
- Gmail sync
- Reset emails
- Parse status dashboard
- Integrity check
- Test card extraction
- Delete all purchases

**Emails Page**
- View synced emails
- Parse status indicators
- Email details modal
- Parsed/Unparsed/Failed counts

## 🔧 Technical Details

### Tech Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | Framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | Latest | Type safety |
| Supabase | Latest | PostgreSQL + Auth + RLS |
| Tailwind CSS | v4 | Styling |
| shadcn/ui | Latest | UI components |
| Redux Toolkit | Latest | State management |
| date-fns | 4.1.0 | Date formatting |
| Lucide React | Latest | Icons |

### Important Patterns

**Date Handling**
- Database stores TIMESTAMPTZ (UTC)
- `parseUTCDate()` utility appends 'Z' to force UTC interpretation
- Prevents timezone display bugs
- Purchase dates use email received_at if extraction fails

**Card Number Extraction**
- Handles multiple formats: `4537*****798****` or `**** 0798`
- Regex: `(\d{4})\*+\*{4}|\*{4}\s*(\d{4})`
- Pads 3-digit cards to 4 digits (e.g., `798` → `0798`)

**Shift Statistics**
- Filter purchases by card_id only (no employee_id check)
- Use purchase_date for time comparison
- Ongoing shifts use current time as end_time

## 🗂️ File Structure

```
app/
  (dashboard)/
    purchases/page.tsx - Main purchases table
    shifts/page.tsx - Card shift tracking
    employees/page.tsx - Employee management
    cards/page.tsx - Card management
    emails/page.tsx - Email viewing
    parsing-rules/page.tsx - Parsing rules CRUD
    tools/page.tsx - Developer tools
  api/
    parser/ - Email parsing endpoints
    gmail/ - Gmail sync endpoints
    debug/ - Debugging tools endpoints

components/
  purchases/PurchaseFilters.tsx - Advanced filtering
  Sidebar.tsx - Navigation

lib/
  parser/engine.ts - Email parsing logic
  gmail/service.ts - Gmail API wrapper
  utils/date.ts - parseUTCDate utility
  supabase/ - Client & server instances
  store/ - Redux slices

supabase/migrations/
  20260207_initial_schema.sql - Base schema
  20260208_add_time_support.sql - TIMESTAMPTZ migration
  20260208_card_shifts.sql - Shifts table
  20260209_add_order_number.sql - Order number field
  20260209_add_initials_field.sql - Replace is_reviewed with initials
```

## 🔐 Security

### Authentication
- Supabase Auth with Google OAuth
- Server-side session validation
- Protected routes via middleware
- HttpOnly cookies

### Authorization
- Row Level Security (RLS) on all tables
- All queries filtered by `auth.uid() = admin_user_id`
- No cross-admin data access

### Gmail OAuth
- Minimal scopes (gmail.readonly, gmail.labels)
- Tokens encrypted in Supabase
- Auto-refresh on expiry
- Disconnectable anytime

## 📈 Data Flow

### Email Sync → Parse → Purchase
```
1. User clicks "Sync Gmail"
2. Fetch emails from Gmail API
3. Store in raw_emails (dedupe by gmail_message_id)
4. Auto-parse with active parsing rules
5. Extract: amount, merchant, card, date
6. Find card by last_four match
7. Create purchase record
8. Mark email as parsed
```

### Shift-Based Filtering
```
1. User clicks shift row
2. Navigate to purchases with filters:
   - cardId (UUID)
   - startDate (ISO timestamp)
   - endDate (ISO timestamp or null)
3. Auto-enable selection mode
4. Filter purchases by card + date range
5. Auto-select matching purchases
```

## 🚀 Deployment

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

### Build Status
✅ Production build passes
✅ TypeScript strict mode
✅ All type errors resolved
✅ No runtime errors

## 🔄 Recent Major Changes

### Feb 8-9, 2026
- ✅ Removed employee column from purchases table
- ✅ Removed source column from purchases table
- ✅ Added order_number field (6 digits)
- ✅ Replaced is_reviewed checkbox with reviewed_by_initials input
- ✅ Fixed purchase sorting to use purchase_date
- ✅ Fixed timezone display bugs with parseUTCDate()
- ✅ Fixed shift statistics to work without employee_id matching
- ✅ Updated card extraction regex for multiple formats
- ✅ Added Test Card Extraction debug tool
- ✅ Removed employeeIds from shift navigation

## 📝 Known Behaviors

### Parsing
- Emails without card numbers in body won't link to cards
- Parse errors stored in raw_emails.parse_error
- Orphaned emails (parsed but no purchase) can be re-parsed
- Duplicate detection uses raw_email_id

### Shifts
- Multiple employees can use same card (overlaps possible)
- Ongoing shifts calculate stats in real-time
- Shift stats match by card + time range only

### Filters
- Date filters use purchase_date (transaction time)
- Reviewed filter checks for non-empty initials
- Card filter allows multiple selection

## 🎯 Future Considerations

### Short-term
- Scheduled auto-sync (cron job)
- Dashboard analytics with charts
- Receipt attachments
- Budget tracking

### Medium-term
- Gmail webhook push notifications
- Multi-currency support
- Advanced search/filtering
- Bulk operations

### Long-term
- Mobile app
- Audit logging
- Compliance reports
- OCR for receipts

---

**Last Updated:** Feb 9, 2026
**Current Status:** ✅ Fully Functional
**Build Status:** ✅ Production Ready
