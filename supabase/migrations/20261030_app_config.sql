-- Migration: Remote App Configuration Foundation
-- File: supabase/migrations/20261030_app_config.sql
-- Purpose: Foundation for remote app settings, version enforcement, and feature flags
-- IMPORTANT: DO NOT APPLY AUTOMATICALLY TO PRODUCTION. Requires administrator approval.

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY CHECK (char_length(trim(key)) > 0 AND key ~ '^[a-z0-9_]+$'),
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false, -- If true, accessible by anonymous/authenticated app clients
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_config IS 'Remote application configuration parameters, feature flags, and version policies.';
COMMENT ON COLUMN public.app_config.is_public IS 'Controls whether mobile and web clients can read this key without administrative privileges.';

-- Enable Row-Level Security
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access strictly for keys explicitly marked as public (e.g. min_supported_version)
DROP POLICY IF EXISTS "Allow public read access to public app_config" ON public.app_config;
CREATE POLICY "Allow public read access to public app_config" 
  ON public.app_config
  FOR SELECT 
  TO anon, authenticated 
  USING (is_public = true);

-- Deny all direct client-side mutations (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Deny direct client mutations on app_config" ON public.app_config;
CREATE POLICY "Deny direct client mutations on app_config" 
  ON public.app_config
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- Standard Default Configuration Foundation (Safe, Inactive Defaults)
INSERT INTO public.app_config (key, value, description, is_public)
VALUES
  (
    'maintenance_mode',
    '{"enabled": false, "message": "LifeTrack Pro is briefly offline for scheduled system optimization. Please check back shortly."}'::jsonb,
    'Global maintenance mode gate. When enabled: true, the mobile app halts API requests and shows a maintenance screen.',
    true
  ),
  (
    'min_supported_version',
    '{"min_version": "1.0.0", "latest_version": "1.0.0", "force_update": false, "store_url": "https://play.google.com/store/apps/details?id=com.lifetrackpro"}'::jsonb,
    'Minimum required app version to ensure compatibility with backend database schemas.',
    true
  ),
  (
    'feature_flags',
    '{"enable_study_rooms": true, "enable_ambient_sounds": true, "enable_ai_insights": true, "enable_flashcards": true}'::jsonb,
    'Dynamic feature flags controlling client-side module availability.',
    true
  )
ON CONFLICT (key) DO NOTHING;
