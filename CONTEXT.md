# PurchaseTracker - Project Context & Planning

## 🎯 Project Vision

**PurchaseTracker** is a single-admin application designed to track employee purchases through automated bank transaction email parsing.

### Core Concept

- **Single Admin User** manages everything
- **Employees** are data records (NOT user accounts with login)
- **Cards** are assigned to employees
- **Bank emails** are synced from Gmail
- **Purchases** are automatically extracted from emails and linked to employees via cards
- **Admin** reviews, categorizes, and analyzes all spending

## 🏗️ Architecture Decisions

### 1. Single-Admin Model (Simplified)

**Decision:** One admin user, employees are just data entries

**Rationale:**
- Simpler authentication (no multi-user complexity)
- No role-based permissions needed
- No employee data access controls
- Admin has full visibility over all data
- Employees never log in

**Impact:**
- All tables have `admin_user_id` foreign key
- RLS policies scope everything to admin user
- No employee authentication system needed

### 2. Card-Based Employee Linking

**Decision:** Link purchases to employees via card assignments

**Rationale:**
- Bank emails typically include card last 4 digits
- Parsing card number from email is reliable
- One-to-one or one-to-many (shared cards) mapping
- Automatic employee assignment without manual intervention

**Flow:**
```
Email contains: Card ending 1234
↓
System finds: Card 1234 assigned to John Smith
↓
Purchase auto-linked to John Smith
```

### 3. Database Design

**Decision:** Normalized relational schema with PostgreSQL

**Key Tables:**
- `employees` - Employee records
- `cards` - Company cards with employee assignments
- `categories` - Purchase categories (color-coded)
- `purchases` - Transaction records
- `parsing_rules` - Email parsing configurations
- `raw_emails` - Synced Gmail messages
- `gmail_sync_state` - OAuth tokens and sync status

**RLS Policies:**
- All tables filtered by `admin_user_id`
- Server-side enforcement via Supabase

### 4. Email Processing Pipeline

**Decision:** Two-stage processing (sync → parse)

**Stage 1: Email Sync**
- Fetch emails from Gmail via OAuth
- Store raw emails in `raw_emails` table
- No processing, just storage

**Stage 2: Parsing**
- Apply parsing rules to extract data
- Match patterns (regex) for amount, merchant, date, card
- Create `purchases` records
- Link to employee via card

**Rationale:**
- Separation of concerns
- Can re-parse emails if rules change
- Keeps raw data for debugging
- Allows manual intervention

### 5. Tech Stack Choices

| Technology | Choice | Rationale |
|------------|--------|-----------|
| Framework | Next.js 16 App Router | Modern, SSR, API routes built-in |
| Language | TypeScript | Type safety, better DX |
| Database | Supabase (PostgreSQL) | Managed, RLS, realtime, auth built-in |
| Auth | Supabase Auth + Google OAuth | Unified auth, OAuth for Gmail |
| Styling | Tailwind CSS v4 | Utility-first, fast, customizable |
| UI Components | shadcn/ui | Copy-paste, customizable, Radix UI |
| State Management | Redux Toolkit | Centralized state, dev tools |
| Email API | Google Gmail API | Official, well-documented |
| Icons | Lucide React | Modern, consistent |
| Dates | date-fns | Lightweight, tree-shakeable |

## 📋 Implementation Phases

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Next.js project setup
- [x] Tailwind CSS + shadcn/ui
- [x] Supabase configuration
- [x] Redux store setup
- [x] Database schema & migrations
- [x] Environment variables

### ✅ Phase 2: Core CRUD (COMPLETE)
- [x] Admin authentication (signup/login/logout)
- [x] Protected routes
- [x] Employees CRUD
- [x] Cards CRUD with employee assignment
- [x] Categories CRUD (9 default categories)
- [x] Purchases CRUD (manual entry)
- [x] Dashboard layout & navigation

### ✅ Phase 3: Gmail Integration (COMPLETE)
- [x] Google OAuth setup
- [x] Gmail API service layer
- [x] OAuth authorization flow
- [x] Token management & auto-refresh
- [x] Gmail labels fetching
- [x] Email sync functionality
- [x] Sync history tracking
- [x] Gmail Settings UI

### 🚧 Phase 4: Email Parsing (NEXT)
- [ ] Parsing rules CRUD UI
- [ ] Rule priority system
- [ ] Pattern matching (sender, subject, body)
- [ ] Data extraction (amount, merchant, date, card)
- [ ] Regex pattern tester
- [ ] Parser engine implementation
- [ ] Auto-parse on email sync
- [ ] Error handling & logging
- [ ] Manual re-parse functionality

### ⏳ Phase 5: Dashboard Analytics (FUTURE)
- [ ] Overview metrics (total spent, # purchases)
- [ ] Spending by employee (pie chart)
- [ ] Spending by category (bar chart)
- [ ] Spending trends over time (line chart)
- [ ] Recent purchases widget
- [ ] Top merchants
- [ ] Budget vs actual
- [ ] Date range filters

### ⏳ Phase 6: Advanced Features (FUTURE)
- [ ] Advanced filtering (multi-select)
- [ ] Search functionality (fuzzy search)
- [ ] Bulk operations (bulk categorize, bulk review)
- [ ] Export to CSV/Excel
- [ ] Purchase receipts/attachments
- [ ] Budget tracking per employee/category
- [ ] Email notifications/alerts
- [ ] Scheduled email sync (cron jobs)
- [ ] Gmail webhook push notifications
- [ ] Audit log/activity history

## 🎨 Design Patterns

### 1. Data Flow Pattern

```
User Action
    ↓
React Component (UI)
    ↓
Redux Action Dispatch
    ↓
Supabase Client (API call)
    ↓
Database (PostgreSQL with RLS)
    ↓
Response
    ↓
Redux State Update
    ↓
Component Re-render
```

### 2. Authentication Pattern

```
User Login
    ↓
Supabase Auth
    ↓
Session Cookie (httpOnly)
    ↓
Middleware validates session
    ↓
Protected routes accessible
```

### 3. Gmail Sync Pattern

```
User clicks "Sync Now"
    ↓
Check token expiry
    ↓
Refresh if needed
    ↓
Fetch emails from Gmail API
    ↓
Check if email already exists (gmail_message_id)
    ↓
Store new emails in raw_emails
    ↓
Update last_sync_at
    ↓
Return count of synced emails
```

### 4. Purchase Creation Pattern

**Manual:**
```
User fills form
    ↓
Select card → auto-populate employee
    ↓
Submit
    ↓
Insert into purchases table
    ↓
Redux state update
    ↓
Table re-renders
```

**Automated (Future):**
```
Email synced
    ↓
Match parsing rule
    ↓
Extract: amount, merchant, date, card last 4
    ↓
Find card by last 4 digits
    ↓
Get employee from card assignment
    ↓
Create purchase record
    ↓
Mark email as parsed
```

## 🗄️ Database Schema Details

### Key Relationships

```
auth.users (1)
    ↓
    └── admin_user_id (FK on all tables)
        ├── employees (many)
        │   └── id ←── cards.employee_id (FK)
        ├── cards (many)
        │   └── id ←── purchases.card_id (FK)
        ├── categories (many)
        │   └── id ←── purchases.category_id (FK)
        ├── purchases (many)
        │   └── employee_id (auto from card)
        ├── raw_emails (many)
        ├── parsing_rules (many)
        └── gmail_sync_state (one)
```

### Indexes for Performance

```sql
-- Frequently queried columns
idx_employees_admin_user_id
idx_cards_admin_user_id
idx_cards_employee_id
idx_cards_last_four
idx_purchases_admin_user_id
idx_purchases_card_id
idx_purchases_category_id
idx_purchases_employee_id
idx_purchases_date
idx_raw_emails_gmail_id
idx_raw_emails_parsed
```

### Triggers

```sql
-- Auto-update updated_at timestamp
update_employees_updated_at
update_cards_updated_at
update_categories_updated_at
update_purchases_updated_at
update_parsing_rules_updated_at
update_gmail_sync_state_updated_at
```

## 🔐 Security Considerations

### Authentication
- Supabase Auth handles session management
- Server-side session validation via middleware
- Protected routes check auth status
- Tokens stored in httpOnly cookies

### Authorization
- Row Level Security (RLS) on all tables
- All queries filtered by `auth.uid() = admin_user_id`
- No direct database access from client
- Server-side validation in API routes

### Gmail OAuth
- Minimal scopes requested (gmail.readonly, gmail.labels)
- Tokens encrypted at rest in Supabase
- Refresh tokens used to maintain access
- User can disconnect anytime
- Tokens deleted on disconnect

### Data Privacy
- Admin can only see their own data
- No cross-admin data leakage
- Emails stored per-admin
- No PII shared with third parties

## 📊 Data Models

### Employee
```typescript
{
  id: UUID
  admin_user_id: UUID
  name: string
  email?: string
  department?: string
  notes?: string
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### Card
```typescript
{
  id: UUID
  admin_user_id: UUID
  last_four: string (4 digits)
  bank_name: string
  card_type?: 'visa' | 'mastercard' | 'amex' | 'other'
  nickname?: string
  employee_id?: UUID (FK to employees)
  is_shared: boolean
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### Purchase
```typescript
{
  id: UUID
  admin_user_id: UUID
  amount: decimal(12,2)
  currency: string (default 'CAD')
  merchant?: string
  description?: string
  purchase_date: date
  card_id?: UUID (FK to cards)
  category_id?: UUID (FK to categories)
  employee_id?: UUID (FK to employees, auto from card)
  raw_email_id?: UUID (FK to raw_emails)
  source: 'email' | 'manual'
  notes?: string
  is_reviewed: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### Parsing Rule (Future)
```typescript
{
  id: UUID
  admin_user_id: UUID
  name: string
  description?: string
  is_active: boolean
  priority: number (for rule ordering)
  
  // Matching criteria (regex patterns)
  sender_pattern?: string
  subject_pattern?: string
  body_pattern?: string
  
  // Extraction patterns (regex with capture groups)
  amount_pattern: string (required)
  merchant_pattern?: string
  date_pattern?: string
  card_last_four_pattern?: string
  
  date_format: string (default 'MMM dd, yyyy')
  created_at: timestamp
  updated_at: timestamp
}
```

## 🎯 Current State

### What's Working
- ✅ Admin authentication & session management
- ✅ Full CRUD for Employees, Cards, Categories, Purchases
- ✅ Auto-link purchases to employees via card selection
- ✅ Gmail OAuth connection
- ✅ Email syncing from Gmail
- ✅ Token refresh on expiry
- ✅ Responsive UI with error handling

### What's Next
- 🚧 Parsing rules CRUD UI
- 🚧 Regex pattern tester
- 🚧 Parser engine to extract data from emails
- 🚧 Auto-create purchases from parsed emails
- 🚧 Dashboard analytics with charts

### Known Limitations
- Manual sync only (no scheduled/automatic sync yet)
- No email parsing yet (raw emails stored but not processed)
- No analytics dashboard (placeholder only)
- No export functionality
- No bulk operations

## 🔮 Future Enhancements

### Short-term (Next Sprint)
1. **Email Parsing Engine**
   - Regex-based pattern matching
   - Configurable parsing rules
   - Test interface for rules
   - Auto-parse on sync

2. **Dashboard Analytics**
   - Spending overview
   - Charts (Recharts)
   - Date range filters

### Medium-term
3. **Scheduled Sync**
   - Cron job for hourly/daily sync
   - Vercel Cron integration

4. **Advanced Filtering**
   - Multi-select filters
   - Date range picker
   - Search across all fields

5. **Export Functionality**
   - CSV export
   - Excel export
   - PDF reports

### Long-term
6. **Webhooks & Real-time**
   - Gmail push notifications
   - Real-time sync on new emails
   - WebSocket updates for UI

7. **Budget Management**
   - Set budgets per employee/category
   - Budget alerts
   - Forecast spending

8. **Attachments & Receipts**
   - Upload receipt images
   - Link to email attachments
   - OCR for receipt data

9. **Multi-currency**
   - Support multiple currencies
   - Exchange rate conversion
   - Currency selector per purchase

10. **Audit & Compliance**
    - Activity log
    - Change history
    - Compliance reports

## 🧪 Testing Strategy

### Manual Testing (Current)
- Feature testing after each implementation
- User flow testing
- Edge case testing

### Automated Testing (Future)
- Unit tests (Jest)
- Integration tests (Playwright)
- E2E tests
- API tests

## 📈 Performance Considerations

### Current Optimizations
- Indexed database queries
- Redux for client-side caching
- Server-side rendering for initial load

### Future Optimizations
- Pagination for large datasets
- Virtual scrolling for tables
- Lazy loading of components
- Incremental email sync (only new emails)
- Database query optimization

## 🛠️ Development Workflow

### Code Organization
```
- Components: Reusable UI components
- Pages: Route-based page components
- API Routes: Server-side endpoints
- Services: Business logic (Gmail, parsing)
- Store: Redux slices for state management
- Types: TypeScript definitions
- Utils: Helper functions
```

### Naming Conventions
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Types: `PascalCase`
- Database tables: `snake_case`

### Git Workflow (Recommended)
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

## 📝 TODOs & Backlog

### High Priority
- [ ] Implement parsing rules CRUD
- [ ] Build regex pattern tester
- [ ] Create parser engine
- [ ] Add dashboard analytics

### Medium Priority
- [ ] Add scheduled email sync
- [ ] Implement export functionality
- [ ] Add bulk operations
- [ ] Create advanced filters

### Low Priority
- [ ] Add attachment support
- [ ] Implement webhooks
- [ ] Multi-currency support
- [ ] Audit logging

### Technical Debt
- [ ] Add comprehensive error boundaries
- [ ] Improve loading states (skeletons)
- [ ] Add form validation with Zod
- [ ] Optimize table rendering for large datasets
- [ ] Add unit tests
- [ ] Improve accessibility (ARIA labels)

## 🎓 Learning Resources

### Technologies Used
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Gmail API](https://developers.google.com/gmail/api)

---

**Last Updated:** Feb 7, 2026
**Current Phase:** Phase 3 Complete, Phase 4 (Email Parsing) Next
**Build Status:** ✅ Production Ready
