-- =====================================================
-- PURCHASE TRACKER - Initial Database Schema
-- Single Admin System - Simplified Architecture
-- =====================================================

-- =====================================================
-- EMPLOYEES TABLE (Simple data records, NOT users)
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_admin_user_id ON employees(admin_user_id);

-- =====================================================
-- CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_four VARCHAR(4) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  card_type VARCHAR(50),
  nickname VARCHAR(100),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_admin_user_id ON cards(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_cards_employee_id ON cards(employee_id);
CREATE INDEX IF NOT EXISTS idx_cards_last_four ON cards(last_four);

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_admin_user_id ON categories(admin_user_id);

-- =====================================================
-- PARSING RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS parsing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  -- Matching criteria
  sender_pattern VARCHAR(500),
  subject_pattern VARCHAR(500),
  body_pattern VARCHAR(500),
  
  -- Extraction patterns
  amount_pattern VARCHAR(500) NOT NULL,
  merchant_pattern VARCHAR(500),
  date_pattern VARCHAR(500),
  card_last_four_pattern VARCHAR(500),
  
  date_format VARCHAR(100) DEFAULT 'MMM dd, yyyy',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parsing_rules_admin_user_id ON parsing_rules(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_parsing_rules_priority ON parsing_rules(priority DESC);

-- =====================================================
-- RAW EMAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS raw_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255) UNIQUE NOT NULL,
  sender VARCHAR(500),
  subject VARCHAR(1000),
  body TEXT,
  received_at TIMESTAMPTZ,
  parsed BOOLEAN DEFAULT false,
  parse_error TEXT,
  parsing_rule_id UUID REFERENCES parsing_rules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_emails_admin_user_id ON raw_emails(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_raw_emails_gmail_id ON raw_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_raw_emails_parsed ON raw_emails(parsed);

-- =====================================================
-- PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core purchase data
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  merchant VARCHAR(500),
  description TEXT,
  purchase_date DATE NOT NULL,
  
  -- Relationships
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  raw_email_id UUID REFERENCES raw_emails(id) ON DELETE SET NULL,
  
  -- Source tracking
  source VARCHAR(50) DEFAULT 'email',
  
  -- Metadata
  notes TEXT,
  is_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_admin_user_id ON purchases(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_card_id ON purchases(card_id);
CREATE INDEX IF NOT EXISTS idx_purchases_category_id ON purchases(category_id);
CREATE INDEX IF NOT EXISTS idx_purchases_employee_id ON purchases(employee_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date DESC);

-- =====================================================
-- GMAIL SYNC STATE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gmail_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  
  -- Sync configuration
  label_id VARCHAR(255),
  label_name VARCHAR(255),
  
  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_history_id VARCHAR(255),
  
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_sync_admin_user_id ON gmail_sync_state(admin_user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (SIMPLIFIED)
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_sync_state ENABLE ROW LEVEL SECURITY;

-- Single policy per table: admin can manage their own data
CREATE POLICY "Admin manages own employees" ON employees
  FOR ALL USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin manages own cards" ON cards
  FOR ALL USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin manages own categories" ON categories
  FOR ALL USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin manages own parsing_rules" ON parsing_rules
  FOR ALL USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin manages own raw_emails" ON raw_emails
  FOR ALL USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin manages own purchases" ON purchases
  FOR ALL USING (auth.uid() = admin_user_id);

CREATE POLICY "Admin manages own gmail_sync_state" ON gmail_sync_state
  FOR ALL USING (auth.uid() = admin_user_id);

-- =====================================================
-- SEED DEFAULT CATEGORIES
-- =====================================================
-- Note: These will be inserted via application logic on first user signup
-- to ensure they get the correct admin_user_id

-- =====================================================
-- FUNCTIONS FOR AUTO-UPDATING updated_at TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsing_rules_updated_at BEFORE UPDATE ON parsing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_sync_state_updated_at BEFORE UPDATE ON gmail_sync_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
