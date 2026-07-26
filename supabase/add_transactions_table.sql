-- 1. Create custom enum types if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    CREATE TYPE public.transaction_source AS ENUM ('manual', 'sms', 'screenshot', 'invoice', 'statement');
  END IF;
END $$;

-- 2. Create transactions table
DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  type public.transaction_type NOT NULL DEFAULT 'expense',
  merchant TEXT NOT NULL CHECK (char_length(merchant) > 0),
  category TEXT NOT NULL CHECK (char_length(category) > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  source public.transaction_source NOT NULL DEFAULT 'manual',
  raw_text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Financial transactions containing amounts, categories, and AI extraction sources.';

-- 3. Bind timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create optimization indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);

-- 5. Enable Row-Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Allow select transactions for owner" ON public.transactions;
CREATE POLICY "Allow select transactions for owner" ON public.transactions 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert transactions for owner" ON public.transactions;
CREATE POLICY "Allow insert transactions for owner" ON public.transactions 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update transactions for owner" ON public.transactions;
CREATE POLICY "Allow update transactions for owner" ON public.transactions 
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete transactions for owner" ON public.transactions;
CREATE POLICY "Allow delete transactions for owner" ON public.transactions 
  FOR DELETE TO authenticated USING (user_id = auth.uid());
