-- Migration: Add co_host_ids and banned_user_ids to study_rooms
-- Enables Host/Co-host management, member removal (kick) with re-entry prevention, and delegation

ALTER TABLE public.study_rooms 
ADD COLUMN IF NOT EXISTS co_host_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS banned_user_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- Update RLS policies to allow co-hosts to update study_rooms
DROP POLICY IF EXISTS "Allow update study rooms for host" ON public.study_rooms;
DROP POLICY IF EXISTS "Allow update study rooms for host and co-hosts" ON public.study_rooms;

CREATE POLICY "Allow update study rooms for host and co-hosts" 
ON public.study_rooms 
FOR UPDATE 
TO authenticated 
USING (host_id = auth.uid() OR auth.uid() = ANY(co_host_ids)) 
WITH CHECK (host_id = auth.uid() OR auth.uid() = ANY(co_host_ids));
