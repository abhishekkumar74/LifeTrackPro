-- ==========================================
-- Migration: Secret Journal Vault & Physical Diary Entries Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  content TEXT NOT NULL,
  achievements TEXT NOT NULL DEFAULT '',
  not_to_dos TEXT NOT NULL DEFAULT '',
  improvements TEXT NOT NULL DEFAULT '',
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_of_day TEXT DEFAULT 'night' CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  is_locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist for existing tables
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS achievements TEXT NOT NULL DEFAULT '';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS not_to_dos TEXT NOT NULL DEFAULT '';
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS improvements TEXT NOT NULL DEFAULT '';

COMMENT ON TABLE public.journal_entries IS 'PIN-protected physical diary entries with structured growth sections (achievements, not-to-dos, improvements).';

-- Performance index for journal entry queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON public.journal_entries(user_id, entry_date DESC);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Strictly restrict to authenticated entry owner
DROP POLICY IF EXISTS "Allow owner select journal_entries" ON public.journal_entries;
CREATE POLICY "Allow owner select journal_entries"
  ON public.journal_entries FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow owner insert journal_entries" ON public.journal_entries;
CREATE POLICY "Allow owner insert journal_entries"
  ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow owner update journal_entries" ON public.journal_entries;
CREATE POLICY "Allow owner update journal_entries"
  ON public.journal_entries FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow owner delete journal_entries" ON public.journal_entries;
CREATE POLICY "Allow owner delete journal_entries"
  ON public.journal_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger for auto updating updated_at timestamp
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
