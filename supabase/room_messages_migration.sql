-- ==========================================
-- Migration: Persistent Study Room Chat Messages Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_initials TEXT NOT NULL,
  user_avatar TEXT,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.room_messages IS 'Persistent chat messages sent within study rooms.';

-- Performance index for room chat querying
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id_created_at ON public.room_messages(room_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- 1. Anyone authenticated can select room messages
DROP POLICY IF EXISTS "Allow select room_messages for authenticated" ON public.room_messages;
CREATE POLICY "Allow select room_messages for authenticated"
  ON public.room_messages FOR SELECT TO authenticated USING (true);

-- 2. Authenticated users can insert their own messages into room_messages
DROP POLICY IF EXISTS "Allow insert room_messages for sender" ON public.room_messages;
CREATE POLICY "Allow insert room_messages for sender"
  ON public.room_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Enable Realtime for room_messages table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
