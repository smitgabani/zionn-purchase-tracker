# Product Requirements Document (PRD)
# Purchase Parser - Email-Based Expense Tracking System

**Version:** 1.0  
**Date:** February 2026  
**Status:** Current Production System

---

## Executive Summary

Purchase Parser is an automated expense tracking system designed for restaurant/retail businesses to monitor employee purchases during work shifts. The system automatically parses receipt emails from credit card companies, extracts purchase details, and associates them with employee shifts for real-time expense monitoring.

---

## 1. Product Overview

### 1.1 Vision
Eliminate manual expense tracking by automatically parsing receipt emails and correlating purchases with employee work shifts in real-time.

### 1.2 Target Users
- **Primary:** Small to medium restaurant/retail business owners
- **Secondary:** Managers tracking employee expenses
- **Users per deployment:** 1-10 employees per organization

### 1.3 Core Value Proposition
- **Zero manual data entry** - emails are automatically parsed
- **Real-time visibility** - see expenses as they happen during shifts
- **Shift-based tracking** - correlate purchases with work hours
- **Historical analysis** - export and analyze spending patterns

---

## 2. Core Features

### 2.1 Authentication & User Management
**Priority:** P0 (Critical)

**Requirements:**
- Email/password authentication via Supabase Auth
- Google OAuth integration for Gmail access
- Single-user per account model
- Session management with automatic token refresh

**User Stories:**
- As a user, I can sign up with email/password
- As a user, I can log in securely
- As a user, I can connect my Google account for Gmail access
- As a user, I remain logged in across sessions

---

### 2.2 Gmail Integration
**Priority:** P0 (Critical)

**Requirements:**
- OAuth 2.0 integration with Gmail API
- Automatic email syncing via cron job
- Label-based email filtering
- Token refresh mechanism
- Complete sync option for historical emails
- Incremental sync for new emails

**Technical Specs:**
- Uses Gmail API v1
- Syncs emails with specific labels (configurable)
- Stores refresh tokens securely in database
- Cron job runs every 15 minutes
- Complete sync can process 500+ emails

**User Stories:**
- As a user, I can connect my Gmail account
- As a user, emails are automatically synced without manual intervention
- As a user, I can trigger a complete historical sync
- As a user, I can configure which email labels to monitor

---

### 2.3 Email Parsing Engine
**Priority:** P0 (Critical)

**Requirements:**
- Pattern-based parsing rules
- Support for multiple merchants
- Extract: merchant name, amount, date/time, order number, card last 4 digits
- Configurable regex patterns
- Priority-based rule execution
- Active/inactive rule management

**Technical Specs:**
- Rules stored in `parsing_rules` table
- Each rule has: merchant pattern, amount pattern, date pattern, card pattern, order pattern
- Rules have priority (lower number = higher priority)
- Rules can be active/inactive
- Pattern testing interface for rule validation

**Supported Data Extraction:**
1. **Merchant Name** - Extracted from email subject/body
2. **Purchase Amount** - Dollar amount with decimal
3. **Purchase Date/Time** - UTC timestamp
4. **Card Last 4 Digits** - For card identification
5. **Order Number** - Transaction/receipt number

**User Stories:**
- As a user, I can create parsing rules for different merchants
- As a user, I can test rules before activating them
- As a user, I can prioritize which rules run first
- As a user, I can disable rules without deleting them

---

### 2.4 Card Management
**Priority:** P0 (Critical)

**Requirements:**
- Register credit cards by last 4 digits
- Assign cards to employees
- Support multiple cards per employee
- Card activation/deactivation
- Visual card identification

**Database Schema:**
```sql
cards:
  - id (uuid)
  - user_id (uuid, fk)
  - last_four_digits (text)
  - card_name (text)
  - assigned_employee_id (uuid, nullable, fk)
  - is_active (boolean)
```

**User Stories:**
- As a user, I can add cards to the system
- As a user, I can assign cards to specific employees
- As a user, I can name cards for easy identification
- As a user, I can activate/deactivate cards

---

### 2.5 Employee Management
**Priority:** P0 (Critical)

**Requirements:**
- Create and manage employee records
- Store employee initials for quick identification
- Assign multiple cards to employees
- Track employee purchase history
- Soft delete support

**Database Schema:**
```sql
employees:
  - id (uuid)
  - user_id (uuid, fk)
  - name (text)
  - initials (text, 2-4 characters)
  - created_at (timestamp)
  - deleted_at (timestamp, nullable)
```

**User Stories:**
- As a user, I can add employees to the system
- As a user, I can set employee initials for quick recognition
- As a user, I can view all purchases by employee
- As a user, I can deactivate employees without losing history

---

### 2.6 Shift Management
**Priority:** P0 (Critical)

**Requirements:**
- Start/end employee shifts
- Track ongoing shifts in real-time
- View shift history
- Calculate shift duration
- Associate purchases with shifts automatically
- Manual shift ID assignment support
- Soft delete support

**Database Schema:**
```sql
shifts:
  - id (uuid)
  - user_id (uuid, fk)
  - employee_id (uuid, fk)
  - start_time (timestamp with time zone)
  - end_time (timestamp with time zone, nullable)
  - shift_id (text, nullable)
  - deleted_at (timestamp, nullable)
```

**Business Rules:**
- Employee can have only ONE ongoing shift at a time
- Purchases during shift time are automatically associated
- Shift duration displayed in hours and minutes
- "Shift day" starts at 4 AM (customizable in code)

**User Stories:**
- As a user, I can start a shift for an employee
- As a user, I can see all ongoing shifts on the dashboard
- As a user, I can end a shift
- As a user, I can view shift history with statistics
- As a user, I can click a shift to view all purchases during that shift
- As a user, I can assign custom shift IDs

---

### 2.7 Purchase Tracking
**Priority:** P0 (Critical)

**Requirements:**
- Automatically create purchases from parsed emails
- Manual purchase creation/editing
- Filter purchases by: date range, card, merchant, employee, shift
- Bulk operations (assign to employee, delete)
- Export to CSV
- Pagination for large datasets
- Real-time purchase display

**Database Schema:**
```sql
purchases:
  - id (uuid)
  - user_id (uuid, fk)
  - email_id (uuid, fk)
  - card_id (uuid, nullable, fk)
  - employee_id (uuid, nullable, fk)
  - shift_id (uuid, nullable, fk)
  - merchant (text)
  - amount (numeric)
  - purchase_date (timestamp with time zone)
  - order_number (text, nullable)
  - initials (text, nullable)
  - description (text, nullable)
  - created_at (timestamp)
  - deleted_at (timestamp, nullable)
```

**Filtering Capabilities:**
- Date range (start and end timestamps)
- Card (single or multiple)
- Merchant name (search)
- Employee assignment
- Shift association
- Description search

**User Stories:**
- As a user, I can view all purchases in a paginated list
- As a user, I can filter purchases by multiple criteria
- As a user, I can export filtered purchases to CSV
- As a user, I can select multiple purchases for bulk operations
- As a user, I can manually add/edit purchases
- As a user, I can assign purchases to employees
- As a user, I can see purchase totals in real-time

---

### 2.8 Dashboard & Analytics
**Priority:** P1 (High)

**Requirements:**
- Overview of ongoing shifts
- Real-time shift spending totals
- Today's shift count
- Total spending for day
- Quick access to active shifts
- Alert panel for issues

**Dashboard Metrics:**
1. **Ongoing Shifts** - List of current active shifts with live totals
2. **Shift Spending Today** - Total of all purchases during today's shifts
3. **Total Shifts Today** - Count of shifts that occurred today
4. **Recent Alerts** - Parsing failures, orphaned emails, etc.

**User Stories:**
- As a user, I can see all active shifts at a glance
- As a user, I can see real-time spending during shifts
- As a user, I can click on a shift to view details
- As a user, I can see today's activity summary

---

### 2.9 Merchant Management
**Priority:** P2 (Medium)

**Requirements:**
- Track unique merchants from parsed emails
- Manual merchant creation
- Merchant-based filtering
- Soft delete support

**Database Schema:**
```sql
merchants:
  - id (uuid)
  - user_id (uuid, fk)
  - name (text)
  - created_at (timestamp)
  - deleted_at (timestamp, nullable)
```

**User Stories:**
- As a user, I can view all merchants
- As a user, I can manually add merchants
- As a user, I can filter purchases by merchant

---

### 2.10 Category Management
**Priority:** P2 (Medium)

**Requirements:**
- Pre-defined expense categories
- Category assignment to purchases (future feature)
- Category-based reporting (future feature)

**Pre-defined Categories:**
- Food & Beverages
- Supplies
- Equipment
- Utilities
- Maintenance
- Other

**User Stories:**
- As a user, I can see available categories
- As a user, I can assign categories to purchases (future)

---

## 3. Technical Requirements

### 3.1 Technology Stack

**Frontend:**
- Next.js 15.1.3 (App Router)
- React 19.0.0
- TypeScript 5
- Tailwind CSS 3.4.17
- Redux Toolkit (state management)
- Shadcn/ui components
- date-fns (date handling)

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL database)
- Supabase Auth
- Gmail API
- Vercel cron jobs

**Deployment:**
- Vercel (hosting)
- Supabase (database & auth)

### 3.2 Database Schema
See `supabase/migrations/` for complete schema

**Core Tables:**
1. `users` - Managed by Supabase Auth
2. `emails` - Raw email storage
3. `purchases` - Parsed purchase records
4. `cards` - Credit card registry
5. `employees` - Employee records
6. `shifts` - Work shift tracking
7. `parsing_rules` - Email parsing patterns
8. `merchants` - Merchant directory
9. `categories` - Expense categories

### 3.3 Performance Requirements
- Page load: < 2 seconds
- Email sync: Process 100 emails in < 30 seconds
- Purchase filtering: < 1 second for 1000 records
- Real-time updates: < 500ms for shift totals

### 3.4 Security Requirements
- All API routes require authentication
- Row-level security (RLS) on all tables
- OAuth tokens encrypted in database
- HTTPS only
- CSRF protection via Supabase
- No sensitive data in client state

---

## 4. User Workflows

### 4.1 Initial Setup Workflow
1. User signs up with email/password
2. User connects Gmail account via OAuth
3. User configures Gmail labels to monitor
4. User performs complete historical sync
5. User creates parsing rules for merchants
6. User adds credit cards
7. User adds employees
8. User assigns cards to employees
9. System begins automatic email parsing

### 4.2 Daily Operations Workflow
1. Employee arrives for work
2. Manager starts shift for employee
3. Employee makes purchases using assigned card
4. Receipt emails arrive in Gmail
5. Cron job syncs new emails (every 15 min)
6. Parser extracts purchase details
7. Purchase automatically linked to ongoing shift
8. Manager views real-time spending on dashboard
9. Shift ends
10. Manager reviews shift purchases
11. Manager exports data for accounting

### 4.3 Troubleshooting Workflow
1. Manager notices missing purchases
2. Manager checks "Orphaned Emails" in tools
3. Manager creates/adjusts parsing rule
4. Manager re-parses failed emails
5. System validates purchases created correctly

---

## 5. Data Model Relationships

```
users (Supabase Auth)
  ├── emails (1:many)
  ├── purchases (1:many)
  ├── cards (1:many)
  ├── employees (1:many)
  ├── shifts (1:many)
  ├── parsing_rules (1:many)
  ├── merchants (1:many)
  └── categories (1:many)

employees
  ├── cards (1:many) - via assigned_employee_id
  ├── shifts (1:many)
  └── purchases (1:many)

shifts
  └── purchases (1:many) - via shift_id

emails
  └── purchases (1:1) - via email_id

cards
  └── purchases (1:many) - via card_id
```

---

## 6. API Endpoints

### Authentication
- `POST /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/google/refresh` - Refresh OAuth token

### Gmail Integration
- `POST /api/gmail/sync` - Incremental sync
- `POST /api/gmail/sync-complete` - Complete historical sync
- `GET /api/gmail/labels` - Get Gmail labels
- `POST /api/cron/sync-gmail` - Cron job endpoint

### Parsing
- `POST /api/parser/parse-emails` - Parse all unparsed emails
- `POST /api/parser/test-rule` - Test parsing rule

### Debug/Tools
- `GET /api/debug/parse-status` - System status
- `GET /api/debug/integrity-check` - Data integrity check
- `GET /api/debug/orphaned-emails` - Find unparsed emails
- `POST /api/debug/reset-emails` - Reset parsing status
- `POST /api/debug/dry-run-parse` - Test parsing without saving
- Other debug endpoints...

### Admin
- `POST /api/admin/run-migration` - Run database migrations

---

## 7. Business Rules

### 7.1 Shift Day Logic
- **Shift day** runs from 4:00 AM to 3:59 AM next day
- Purchases are associated with shifts based on purchase timestamp
- Dashboard "Today's shifts" uses shift day calculation

### 7.2 Purchase-Shift Association
- Purchases automatically link to shifts if:
  - Purchase time is between shift start and end
  - Card used belongs to employee on shift
  - One ongoing shift per employee at a time

### 7.3 Timezone Handling
- All timestamps stored in UTC
- Display uses `parseUTCDate()` utility
- Shift day calculation uses UTC timestamps

### 7.4 Soft Deletes
- Employees, shifts, purchases, merchants support soft delete
- `deleted_at` timestamp marks deletion
- Queries filter out soft-deleted records by default
- Maintains referential integrity for historical data

---

## 8. Future Enhancements

### Phase 2 (Planned)
- Category assignment to purchases
- Budget alerts and limits
- Multi-user support (manager + employees)
- Mobile responsive design improvements
- Merchant auto-categorization
- Scheduled reports via email

### Phase 3 (Ideas)
- Receipt image storage
- OCR for receipt images
- Integration with accounting software
- Advanced analytics and charts
- Role-based access control
- API for third-party integrations

---

## 9. Success Metrics

### 9.1 Parsing Accuracy
- **Target:** > 95% of emails successfully parsed
- **Metric:** (Successfully parsed / Total emails) × 100

### 9.2 Time Savings
- **Target:** 80% reduction in manual data entry time
- **Before:** ~10 minutes per purchase manually entered
- **After:** < 2 minutes per purchase (only exceptions)

### 9.3 System Reliability
- **Target:** 99% uptime
- **Target:** < 1% failed email syncs

### 9.4 User Adoption
- **Target:** 100% of purchases tracked via system
- **Target:** Zero manual spreadsheets used

---

## 10. Known Limitations

### Current System
1. **Single-user model** - One account per business
2. **Gmail only** - No support for other email providers
3. **Manual rule creation** - Requires regex knowledge
4. **No receipt images** - Text parsing only
5. **Limited reporting** - Basic CSV export only
6. **No mobile app** - Web interface only
7. **English only** - No internationalization

### Technical Debt
1. **Timezone bugs** - Recently fixed, but may exist elsewhere
2. **No automated tests** - All manual testing
3. **No error tracking** - Console logs only
4. **No backup automation** - Manual Supabase backups
5. **Limited pagination** - May slow with 10,000+ records

---

## Appendix A: Glossary

- **Shift Day**: 24-hour period from 4 AM to 3:59 AM next day
- **Ongoing Shift**: Shift that has been started but not ended
- **Orphaned Email**: Email that was synced but parsing failed
- **Parsing Rule**: Regex pattern set for extracting data from emails
- **Complete Sync**: Historical import of all emails from Gmail
- **Incremental Sync**: Periodic sync of new emails only
- **Soft Delete**: Record marked as deleted but not removed from database
- **RLS**: Row Level Security (Supabase security model)

---

**Document Status:** Complete and Current as of Feb 2026  
**Next Review:** Before rebuild project begins

