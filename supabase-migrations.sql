-- Ads Chargeback - Supabase Database Schema
-- Run these queries in Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE (Supabase Auth)
-- ============================================
-- Supabase automatically creates auth.users table
-- We'll create a public profiles table that links to it

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  google_ads_token TEXT,
  google_customer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. RATES TABLE (Company settings)
-- ============================================

CREATE TABLE public.rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companies JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rates"
  ON public.rates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rates"
  ON public.rates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rates"
  ON public.rates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. CHARGEBACKS TABLE (Audit trail)
-- ============================================

CREATE TABLE public.chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaigns JSONB NOT NULL,
  rates JSONB NOT NULL,
  totals JSONB NOT NULL,
  period JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chargebacks"
  ON public.chargebacks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert chargebacks"
  ON public.chargebacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. INVOICES TABLE (Generated invoices)
-- ============================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chargeback_id UUID REFERENCES public.chargebacks(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  totals JSONB NOT NULL,
  period JSONB NOT NULL,
  pdf_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. INDEXES (Performance)
-- ============================================

CREATE INDEX idx_rates_user_id ON public.rates(user_id);
CREATE INDEX idx_chargebacks_user_id ON public.chargebacks(user_id);
CREATE INDEX idx_chargebacks_created_at ON public.chargebacks(created_at DESC);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- ============================================
-- 6. SAMPLE DATA (Optional)
-- ============================================

-- Insert test user data (after signing up)
-- No need to manually insert - Supabase Auth handles users

-- Insert sample rates
-- INSERT INTO public.rates (user_id, companies)
-- VALUES (
--   'your-user-id-here',
--   '{"Company A": {"withholdingTax": 5, "managementFee": 20, "sst": 8}, "Company B": {"withholdingTax": 5, "managementFee": 20, "sst": 8}}'
-- );

-- ============================================
-- 7. FUNCTIONS & TRIGGERS (Optional)
-- ============================================

-- Auto-update timestamp on insert/update
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rates_timestamp BEFORE UPDATE ON public.rates
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_chargebacks_timestamp BEFORE UPDATE ON public.chargebacks
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_invoices_timestamp BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- DONE!
-- ============================================
-- Run these queries in Supabase SQL Editor
-- Your database is now ready for the app
