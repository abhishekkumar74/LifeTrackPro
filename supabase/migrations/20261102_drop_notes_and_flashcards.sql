-- =====================================================================
-- Migration: Drop Notes & Flashcards Tables
-- Description: Permanently removes notes and flashcards tables, triggers,
--              indexes, and RLS policies to free up database storage and
--              keep the database clean and focused on Syllabus tracking.
-- =====================================================================

-- 1. Drop flashcards table and any dependencies
DROP TABLE IF EXISTS public.flashcards CASCADE;

-- 2. Drop notes table and any dependencies
DROP TABLE IF EXISTS public.notes CASCADE;

-- 3. Update app_config feature flags if present
UPDATE public.app_config
SET value = jsonb_set(value, '{enable_flashcards}', 'false'::jsonb)
WHERE key = 'feature_flags' AND value ? 'enable_flashcards';

-- 4. Reclaim storage space and optimize database catalog
VACUUM ANALYZE;
