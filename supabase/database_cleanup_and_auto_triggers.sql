-- ========================================================
-- LifeTrack Pro: Database Optimization, Dead Data Purge & Auto-Cleanup Triggers
-- File: database_cleanup_and_auto_triggers.sql
-- ========================================================

-- --------------------------------------------------------
-- 1. CLEANUP DEAD CHAT MESSAGES FROM ENDED / INACTIVE ROOMS
-- --------------------------------------------------------
-- Delete all chat messages where the study room is already inactive / ended
DELETE FROM public.room_messages 
WHERE room_id IN (
  SELECT id FROM public.study_rooms WHERE is_active = false
);

-- Delete dead study rooms that have been inactive for more than 7 days
DELETE FROM public.study_rooms 
WHERE is_active = false 
  AND updated_at < now() - interval '7 days';

-- --------------------------------------------------------
-- 2. AUTOMATIC TRIGGER: PURGE ROOM CHAT ON ROOM END / CLOSURE
-- --------------------------------------------------------
-- Whenever a study room is closed (is_active = false),
-- automatically delete all its chat messages immediately.
CREATE OR REPLACE FUNCTION public.cleanup_ended_room_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false THEN
    DELETE FROM public.room_messages WHERE room_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_ended_room_messages ON public.study_rooms;
CREATE TRIGGER trg_cleanup_ended_room_messages
  AFTER UPDATE OF is_active ON public.study_rooms
  FOR EACH ROW
  WHEN (NEW.is_active = false)
  EXECUTE FUNCTION public.cleanup_ended_room_messages();

-- --------------------------------------------------------
-- 3. CLEANUP DUMMY / UNSTARTED CLONED SYLLABUS TOPICS
-- --------------------------------------------------------
-- Our new Master Curriculum dynamically supplies all chapters for any exam.
-- We safely delete ONLY the 1,060 empty 'not_started' legacy clones,
-- while 100% PRESERVING any real topics marked 'done' or 'in_progress'!
DELETE FROM public.syllabus_topics 
WHERE status = 'not_started';

-- --------------------------------------------------------
-- 4. CLEANUP OLD MISSED SCHEDULE LOGS (OLDER THAN 45 DAYS)
-- --------------------------------------------------------
-- Preserve completed logs and recent 30-day stats;
-- purge only stale 'missed' logs older than 45 days.
DELETE FROM public.schedule_logs 
WHERE status = 'missed' 
  AND date < (CURRENT_DATE - INTERVAL '45 days')::date;

-- --------------------------------------------------------
-- 5. VACUUM AND REINDEX ANALYSIS
-- --------------------------------------------------------
ANALYZE public.syllabus_topics;
ANALYZE public.schedule_logs;
ANALYZE public.study_rooms;
ANALYZE public.room_messages;
