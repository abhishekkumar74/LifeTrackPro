-- ==========================================================
-- Migration: Create Schedule Logs table & prevent status downgrade trigger
-- Run this script in the Supabase SQL Editor
-- ==========================================================

-- 1. Create schedule_logs table
CREATE TABLE IF NOT EXISTS public.schedule_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.schedule_blocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped', 'missed')),
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, block_id, date)
);

-- 2. Prevent status downgrade trigger (solves race conditions)
CREATE OR REPLACE FUNCTION public.check_schedule_log_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- If the existing row status is 'completed' or 'skipped', do not allow changing it to 'missed'
  IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'skipped') AND NEW.status = 'missed' THEN
    NEW.status := OLD.status;
    NEW.skip_reason := OLD.skip_reason;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_downgrade_schedule_log ON public.schedule_logs;
CREATE TRIGGER prevent_downgrade_schedule_log
  BEFORE UPDATE ON public.schedule_logs
  FOR EACH ROW EXECUTE FUNCTION public.check_schedule_log_status_transition();

-- 3. Enable Row-Level Security (RLS)
ALTER TABLE public.schedule_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow select schedule_logs for owner" ON public.schedule_logs;
CREATE POLICY "Allow select schedule_logs for owner" ON public.schedule_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert schedule_logs for owner" ON public.schedule_logs;
CREATE POLICY "Allow insert schedule_logs for owner" ON public.schedule_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update schedule_logs for owner" ON public.schedule_logs;
CREATE POLICY "Allow update schedule_logs for owner" ON public.schedule_logs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete schedule_logs for owner" ON public.schedule_logs;
CREATE POLICY "Allow delete schedule_logs for owner" ON public.schedule_logs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_logs_user_id ON public.schedule_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_logs_date ON public.schedule_logs(date);
CREATE INDEX IF NOT EXISTS idx_schedule_logs_block_id ON public.schedule_logs(block_id);

-- 6. Updated At Timestamp Trigger
DROP TRIGGER IF EXISTS update_schedule_logs_updated_at ON public.schedule_logs;
CREATE TRIGGER update_schedule_logs_updated_at BEFORE UPDATE ON public.schedule_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
