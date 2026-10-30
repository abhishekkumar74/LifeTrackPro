-- Migration: Remote App Announcements
-- File: supabase/migrations/20261030_app_announcements.sql
-- Purpose: In-app broadcast notifications and targeted exam announcements
-- IMPORTANT: DO NOT APPLY AUTOMATICALLY TO PRODUCTION. Requires administrator approval.

CREATE TABLE IF NOT EXISTS public.app_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 120),
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 1000),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  target_category TEXT DEFAULT 'all', -- 'all', 'student', 'aspirant', 'jee', 'neet', 'upsc', etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by TEXT, -- Administrator email or identifier
  CONSTRAINT chk_app_announcements_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

COMMENT ON TABLE public.app_announcements IS 'Remote announcements and alerts broadcast to LifeTrack Pro mobile app and web clients.';
COMMENT ON COLUMN public.app_announcements.severity IS 'Alert urgency level: info (blue/cyan), warning (amber), critical (coral/red).';
COMMENT ON COLUMN public.app_announcements.target_category IS 'Exam/student category targeting filter. NULL or "all" delivers to all students.';

-- Indexes for efficient query by active status, temporal ordering, and category
CREATE INDEX IF NOT EXISTS idx_app_announcements_active_created 
  ON public.app_announcements (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_announcements_target 
  ON public.app_announcements (target_category) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_app_announcements_expiry 
  ON public.app_announcements (expires_at) 
  WHERE expires_at IS NOT NULL;

-- Enable Row-Level Security
ALTER TABLE public.app_announcements ENABLE ROW LEVEL SECURITY;

-- App clients (authenticated and anonymous) may only read active, non-expired announcements
DROP POLICY IF EXISTS "Allow public read access to active announcements" ON public.app_announcements;
CREATE POLICY "Allow public read access to active announcements" 
  ON public.app_announcements
  FOR SELECT 
  TO anon, authenticated 
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Deny all direct client-side mutations (INSERT, UPDATE, DELETE)
-- All modifications must execute via authenticated server APIs using the Supabase Service Role key
DROP POLICY IF EXISTS "Deny direct client mutations on app_announcements" ON public.app_announcements;
CREATE POLICY "Deny direct client mutations on app_announcements" 
  ON public.app_announcements
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);
