# PurchaseTracker - Admin Dashboard

A simplified single-admin application to track employee purchases via bank transaction emails.

## 🎯 Architecture Overview

**Single Admin System:**
- ONE admin user account (authenticated via Supabase)
- Employees are NOT users - they're just data records (name, department, contact info)
- Admin assigns cards to employees
- System automatically links purchases to employees based on card assignments
- Gmail integration syncs bank transaction emails automatically
- Admin reviews and categorizes all purchases from one central dashboard

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account (free tier works)
- Google Cloud Console project (for Gmail OAuth)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key

### 3. Set Up Google OAuth (for Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Configure OAuth consent screen
5. Create OAuth credentials (Web application)
6. Add redirect URI: `http://localhost:3000/api/auth/google/callback`

**See [GMAIL_OAUTH_SETUP.md](GMAIL_OAUTH_SETUP.md) for detailed instructions**

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 5. Run Database Migrations

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20260207_initial_schema.sql`
3. Paste and run the SQL

### 6. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Create Your Admin Account

1. Navigate to `/signup`
2. Create your admin account
3. Login at `/login`

**Note:** Default categories will be automatically created on signup.

### 8. Connect Gmail

1. Go to **Gmail Settings** page
2. Click **Connect Gmail**
3. Authorize with your Google account
4. Create a Gmail label (e.g., "Bank Alerts")
5. Select the label in PurchaseTracker
6. Click **Sync Now** to sync emails

## 📁 Project Structure

```
purchase-tracker/
├── app/
│   ├── (auth)/              # Authentication pages (login, signup)
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── employees/       # Employee management
│   │   ├── cards/           # Card management
│   │   ├── categories/      # Category management
│   │   ├── purchases/       # Purchase listing & manual entry
│   │   ├── parsing-rules/   # Email parsing rules
│   │   └── gmail-settings/  # Gmail OAuth & sync settings
│   ├── api/
│   │   ├── auth/google/     # OAuth endpoints
│   │   └── gmail/           # Gmail API endpoints
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Landing page (redirects to dashboard)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── AuthProvider.tsx     # Auth state management
│   ├── ProtectedRoute.tsx   # Route protection
│   ├── Sidebar.tsx          # Navigation sidebar
│   └── Header.tsx           # Top header with user menu
├── lib/
│   ├── gmail/               # Gmail OAuth & API service
│   ├── supabase/            # Supabase client configuration
│   ├── store/               # Redux store and slices
│   ├── types/               # TypeScript type definitions
│   ├── constants/           # App constants (default categories, etc.)
│   └── utils.ts             # Utility functions
└── supabase/
    └── migrations/          # Database schema migrations
```

## 🔑 Key Features

### ✅ Phase 1: Foundation & Core CRUD

- [x] Next.js 16 with App Router
- [x] Tailwind CSS v4 + shadcn/ui components
- [x] Supabase authentication
- [x] Redux Toolkit state management
- [x] Database schema with RLS policies

### ✅ Phase 2: Admin Authentication

- [x] Admin signup/login
- [x] Protected routes
- [x] Auth state management

### ✅ Phase 3: Core Data Management

- [x] **Employees CRUD** - Add, edit, delete employee records
- [x] **Cards CRUD** - Manage company cards, assign to employees
- [x] **Categories CRUD** - Color-coded purchase categories
- [x] **Purchases** - Manual purchase entry, list view, edit, delete

### ✅ Phase 4: Gmail Integration

- [x] **Gmail OAuth** - Connect Gmail accounts securely
- [x] **Label Selection** - Choose which Gmail label to sync
- [x] **Email Sync** - Sync emails from selected label
- [x] **Token Management** - Automatic token refresh
- [x] **Sync History** - Track when emails were last synced

### 🚧 Phase 5: Email Parsing (Coming Soon)

- [ ] Parsing rules CRUD
- [ ] Pattern tester UI
- [ ] Parser engine
- [ ] Auto-parse emails → create purchases
- [ ] Link purchases to employees via cards

### 🚧 Phase 6: Dashboard Analytics (Coming Soon)

- [ ] Spending overview
- [ ] Charts (by employee, category, time)
- [ ] Recent activity
- [ ] Budget tracking

## 🗄️ Database Schema

### Tables

1. **employees** - Employee data records (NOT user accounts)
2. **cards** - Company cards with employee assignments
3. **categories** - Purchase categories (color-coded)
4. **purchases** - Transaction records
5. **parsing_rules** - Email parsing configurations
6. **raw_emails** - Synced Gmail messages
7. **gmail_sync_state** - OAuth tokens and sync status

### Key Relationships

- `cards.employee_id → employees.id` - Card assignment
- `purchases.card_id → cards.id` - Purchase linked to card
- `purchases.employee_id → employees.id` - Auto-populated from card assignment
- `purchases.category_id → categories.id` - Purchase categorization
- `raw_emails.admin_user_id → auth.users.id` - Synced emails per admin

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- All data scoped to `admin_user_id`
- Server-side session management via Supabase SSR
- OAuth tokens stored securely in database
- Minimal Gmail scopes (read-only access)

## 🎨 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui + Radix UI
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + Google OAuth
- **Gmail API:** googleapis
- **State Management:** Redux Toolkit
- **Date Handling:** date-fns
- **Forms:** react-hook-form + zod
- **Charts:** Recharts (for analytics)
- **Icons:** Lucide React

## 📝 Usage Flow

### 1. Set Up Your Data

1. **Add Employees** - Create records for each employee
2. **Add Cards** - Register company cards and assign to employees
3. **Customize Categories** - Adjust default categories or add custom ones

### 2. Connect Gmail

1. **OAuth Setup** - Follow [GMAIL_OAUTH_SETUP.md](GMAIL_OAUTH_SETUP.md)
2. **Connect Account** - Authorize PurchaseTracker to access Gmail
3. **Create Label** - Create a "Bank Alerts" label in Gmail
4. **Set Filters** - Configure Gmail filters to label bank emails
5. **Select Label** - Choose the label in PurchaseTracker
6. **Sync Emails** - Click "Sync Now" to fetch emails

### 3. Track Purchases

**Automatic (from emails):**
- Emails sync from Gmail
- Parsing rules extract purchase data (coming soon)
- Purchases created automatically
- Linked to employees via cards

**Manual Entry:**
- Go to Purchases → Add Purchase
- Fill in amount, merchant, date
- Select card (employee auto-populates)
- Assign category
- Save

### 4. Review & Analyze

- View all purchases in one dashboard
- Filter by employee, card, category, date range
- Mark purchases as reviewed
- Export reports (coming soon)

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Adding New Components

```bash
# Add shadcn/ui components
pnpm dlx shadcn@latest add [component-name]
```

## 🐛 Troubleshooting

### "Invalid API credentials"
- Check that `.env.local` has correct Supabase URL and anon key
- Restart dev server after changing env variables

### "Row Level Security policy violation"
- Ensure you're logged in as an admin
- Verify database migrations ran successfully
- Check that RLS policies are enabled

### "Gmail OAuth redirect_uri_mismatch"
- Verify redirect URI in Google Console matches exactly
- Should be: `http://localhost:3000/api/auth/google/callback`
- Restart dev server after changing env variables

### "Gmail token expired"
- Click "Reconnect" in Gmail Settings
- App will automatically refresh tokens when possible

## 📚 Documentation

- **[README.md](README.md)** - This file (project overview)
- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed step-by-step setup
- **[GMAIL_OAUTH_SETUP.md](GMAIL_OAUTH_SETUP.md)** - Google OAuth configuration
- **[GMAIL_INTEGRATION_SUMMARY.md](GMAIL_INTEGRATION_SUMMARY.md)** - Gmail integration details
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Current features & roadmap

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` (update to production URL)
4. Deploy!

**Important:** Update Google OAuth redirect URI in Google Cloud Console:
```
https://your-domain.vercel.app/api/auth/google/callback
```

## 📄 License

MIT

## 🤝 Contributing

This is a single-admin application template. Feel free to fork and customize for your needs.

---

**Built with ❤️ using Next.js, Supabase, shadcn/ui, and Google Gmail API**
