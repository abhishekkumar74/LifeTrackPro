-- ==========================================
-- LifeTrack Pro — PostgreSQL Database Schema
-- Production-Ready, Non-Destructive Migrations
-- Paste this script directly in the Supabase SQL Editor
-- ==========================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CUSTOM ENUM TYPES (Idempotent creation via PL/pgSQL blocks)
-- ==========================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_category') THEN
    CREATE TYPE public.user_category AS ENUM ('student', 'employee', 'creator', 'entrepreneur', 'educator', 'aspirant');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'peak_time_type') THEN
    CREATE TYPE public.peak_time_type AS ENUM ('morning', 'afternoon', 'night');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timeline_type') THEN
    CREATE TYPE public.timeline_type AS ENUM ('3M', '6M', '1Y', '2Y', '5Y');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
    CREATE TYPE public.goal_status AS ENUM ('active', 'paused', 'achieved', 'abandoned');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_status') THEN
    CREATE TYPE public.milestone_status AS ENUM ('pending', 'completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE public.task_priority AS ENUM ('urgent', 'important', 'normal');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'habit_frequency') THEN
    CREATE TYPE public.habit_frequency AS ENUM ('daily', 'weekdays', 'custom');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'syllabus_status') THEN
    CREATE TYPE public.syllabus_status AS ENUM ('not_started', 'in_progress', 'done', 'needs_revision');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
    CREATE TYPE public.room_type AS ENUM ('silent', 'music', 'discussion');
  END IF;
END $$;

-- ==========================================
-- 2. AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TABLES DEFINITIONS (Idempotent table structure setup)
-- ==========================================

-- Table 1: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  category public.user_category NOT NULL DEFAULT 'student',
  sub_category TEXT[] NOT NULL DEFAULT '{}',
  daily_hours INTEGER NOT NULL DEFAULT 4 CHECK (daily_hours >= 1 AND daily_hours <= 24),
  peak_time public.peak_time_type NOT NULL DEFAULT 'morning',
  xp_points INTEGER NOT NULL DEFAULT 0 CHECK (xp_points >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  ai_insight TEXT,
  ai_insight_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Extends Supabase Auth users to store specific settings, gamification progress, and category structures.';

-- Table 2: goals
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  description TEXT,
  timeline public.timeline_type NOT NULL DEFAULT '6M',
  deadline DATE NOT NULL,
  status public.goal_status NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.goals IS 'Big moonshot goals containing milestones, completion targets, and dynamic pacing checks.';

-- Table 3: milestones
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  due_date DATE,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.milestones IS 'Intermediate goal milestones that cluster tasks together under specific timelines.';

-- Table 4: tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  subject TEXT,
  priority public.task_priority NOT NULL DEFAULT 'normal',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recur_days INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.tasks IS 'Daily actionable items linked to specific exam subjects, milestones, or standalone schedules.';

-- Table 5: habits
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  emoji TEXT NOT NULL DEFAULT '🔥',
  frequency public.habit_frequency NOT NULL DEFAULT 'daily',
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.habits IS 'Habit templates that users configure to execute on recurring cycles.';

-- Table 6: habit_logs
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  done BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
COMMENT ON TABLE public.habit_logs IS 'Daily completion records tracking streaks, with strict unique constraints per habit and date.';

-- Table 8: notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT,
  chapter TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  next_review DATE,
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.notes IS 'Spaced repetition revision notes storing raw rich text structures and SM-2 schedules.';

-- Table 7: focus_sessions
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_goal TEXT NOT NULL CHECK (char_length(session_goal) > 0),
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  subject TEXT,
  sound_used TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL CHECK (ended_at > started_at),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.focus_sessions IS 'Completed Pomodoro intervals capturing subject categories, ambient audio tracks, and flow quality.';

-- Table 9: schedule_blocks
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  subject TEXT,
  color TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  days INTEGER[] NOT NULL DEFAULT '{}',
  specific_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.schedule_blocks IS 'Routine blocks mapping out daily or weekly calendars for study and work.';

-- Table 10: syllabus_topics
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  topic TEXT NOT NULL,
  status public.syllabus_status NOT NULL DEFAULT 'not_started',
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.syllabus_topics IS 'Syllabus maps tracking complete subject structures (NEET/JEE chapters) with distinct statuses.';

-- Table 11: study_rooms
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) > 0),
  subject TEXT,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_type public.room_type NOT NULL DEFAULT 'silent',
  timer_minutes INTEGER NOT NULL DEFAULT 25 CHECK (timer_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.study_rooms IS 'Synchronous real-time study slots tracking participants under collaborative timers.';

-- Table 12: daily_checkins
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
COMMENT ON TABLE public.daily_checkins IS 'Daily self-reflection entries storing mood rates, energy scores, and comments.';

-- ==========================================
-- 4. BINDING TIMESTAMP TRIGGERS (Safe drop & recreate)
-- ==========================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON public.milestones;
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER update_habit_logs_updated_at BEFORE UPDATE ON public.habit_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_focus_sessions_updated_at ON public.focus_sessions;
CREATE TRIGGER update_focus_sessions_updated_at BEFORE UPDATE ON public.focus_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_blocks_updated_at ON public.schedule_blocks;
CREATE TRIGGER update_schedule_blocks_updated_at BEFORE UPDATE ON public.schedule_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_syllabus_topics_updated_at ON public.syllabus_topics;
CREATE TRIGGER update_syllabus_topics_updated_at BEFORE UPDATE ON public.syllabus_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_rooms_updated_at ON public.study_rooms;
CREATE TRIGGER update_study_rooms_updated_at BEFORE UPDATE ON public.study_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_checkins_updated_at ON public.daily_checkins;
CREATE TRIGGER update_daily_checkins_updated_at BEFORE UPDATE ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 5. PERFORMANCE OPTIMIZATION INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON public.milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON public.milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON public.tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_user_id ON public.schedule_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_user_id ON public.syllabus_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_host_id ON public.study_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON public.daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON public.habit_logs(date);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_notes_next_review ON public.notes(next_review);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON public.daily_checkins(date);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_active_is_public ON public.study_rooms(is_active, is_public);

-- ==========================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS across all schema entities
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- 6.1 profiles policies
DROP POLICY IF EXISTS "Allow select profiles for owner" ON public.profiles;
CREATE POLICY "Allow select profiles for owner" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow insert profiles for owner" ON public.profiles;
CREATE POLICY "Allow insert profiles for owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow update profiles for owner" ON public.profiles;
CREATE POLICY "Allow update profiles for owner" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow delete profiles for owner" ON public.profiles;
CREATE POLICY "Allow delete profiles for owner" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- 6.2 goals policies
DROP POLICY IF EXISTS "Allow select goals for owner" ON public.goals;
CREATE POLICY "Allow select goals for owner" ON public.goals FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert goals for owner" ON public.goals;
CREATE POLICY "Allow insert goals for owner" ON public.goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update goals for owner" ON public.goals;
CREATE POLICY "Allow update goals for owner" ON public.goals FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete goals for owner" ON public.goals;
CREATE POLICY "Allow delete goals for owner" ON public.goals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.3 milestones policies
DROP POLICY IF EXISTS "Allow select milestones for owner" ON public.milestones;
CREATE POLICY "Allow select milestones for owner" ON public.milestones FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert milestones for owner" ON public.milestones;
CREATE POLICY "Allow insert milestones for owner" ON public.milestones FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update milestones for owner" ON public.milestones;
CREATE POLICY "Allow update milestones for owner" ON public.milestones FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete milestones for owner" ON public.milestones;
CREATE POLICY "Allow delete milestones for owner" ON public.milestones FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.4 tasks policies
DROP POLICY IF EXISTS "Allow select tasks for owner" ON public.tasks;
CREATE POLICY "Allow select tasks for owner" ON public.tasks FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert tasks for owner" ON public.tasks;
CREATE POLICY "Allow insert tasks for owner" ON public.tasks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update tasks for owner" ON public.tasks;
CREATE POLICY "Allow update tasks for owner" ON public.tasks FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete tasks for owner" ON public.tasks;
CREATE POLICY "Allow delete tasks for owner" ON public.tasks FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.5 habits policies
DROP POLICY IF EXISTS "Allow select habits for owner" ON public.habits;
CREATE POLICY "Allow select habits for owner" ON public.habits FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert habits for owner" ON public.habits;
CREATE POLICY "Allow insert habits for owner" ON public.habits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update habits for owner" ON public.habits;
CREATE POLICY "Allow update habits for owner" ON public.habits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete habits for owner" ON public.habits;
CREATE POLICY "Allow delete habits for owner" ON public.habits FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.6 habit_logs policies
DROP POLICY IF EXISTS "Allow select habit_logs for owner" ON public.habit_logs;
CREATE POLICY "Allow select habit_logs for owner" ON public.habit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert habit_logs for owner" ON public.habit_logs;
CREATE POLICY "Allow insert habit_logs for owner" ON public.habit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update habit_logs for owner" ON public.habit_logs;
CREATE POLICY "Allow update habit_logs for owner" ON public.habit_logs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete habit_logs for owner" ON public.habit_logs;
CREATE POLICY "Allow delete habit_logs for owner" ON public.habit_logs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.7 focus_sessions policies
DROP POLICY IF EXISTS "Allow select focus_sessions for owner" ON public.focus_sessions;
CREATE POLICY "Allow select focus_sessions for owner" ON public.focus_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert focus_sessions for owner" ON public.focus_sessions;
CREATE POLICY "Allow insert focus_sessions for owner" ON public.focus_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update focus_sessions for owner" ON public.focus_sessions;
CREATE POLICY "Allow update focus_sessions for owner" ON public.focus_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete focus_sessions for owner" ON public.focus_sessions;
CREATE POLICY "Allow delete focus_sessions for owner" ON public.focus_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.8 notes policies
DROP POLICY IF EXISTS "Allow select notes for owner" ON public.notes;
CREATE POLICY "Allow select notes for owner" ON public.notes FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert notes for owner" ON public.notes;
CREATE POLICY "Allow insert notes for owner" ON public.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update notes for owner" ON public.notes;
CREATE POLICY "Allow update notes for owner" ON public.notes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete notes for owner" ON public.notes;
CREATE POLICY "Allow delete notes for owner" ON public.notes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.9 schedule_blocks policies
DROP POLICY IF EXISTS "Allow select schedule_blocks for owner" ON public.schedule_blocks;
CREATE POLICY "Allow select schedule_blocks for owner" ON public.schedule_blocks FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert schedule_blocks for owner" ON public.schedule_blocks;
CREATE POLICY "Allow insert schedule_blocks for owner" ON public.schedule_blocks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update schedule_blocks for owner" ON public.schedule_blocks;
CREATE POLICY "Allow update schedule_blocks for owner" ON public.schedule_blocks FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete schedule_blocks for owner" ON public.schedule_blocks;
CREATE POLICY "Allow delete schedule_blocks for owner" ON public.schedule_blocks FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.10 syllabus_topics policies
DROP POLICY IF EXISTS "Allow select syllabus_topics for owner" ON public.syllabus_topics;
CREATE POLICY "Allow select syllabus_topics for owner" ON public.syllabus_topics FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert syllabus_topics for owner" ON public.syllabus_topics;
CREATE POLICY "Allow insert syllabus_topics for owner" ON public.syllabus_topics FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update syllabus_topics for owner" ON public.syllabus_topics;
CREATE POLICY "Allow update syllabus_topics for owner" ON public.syllabus_topics FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete syllabus_topics for owner" ON public.syllabus_topics;
CREATE POLICY "Allow delete syllabus_topics for owner" ON public.syllabus_topics FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6.11 study_rooms policies
DROP POLICY IF EXISTS "Allow select active study rooms for anyone" ON public.study_rooms;
CREATE POLICY "Allow select active study rooms for anyone" ON public.study_rooms FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Allow insert study rooms for host" ON public.study_rooms;
CREATE POLICY "Allow insert study rooms for host" ON public.study_rooms FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Allow update study rooms for host" ON public.study_rooms;
CREATE POLICY "Allow update study rooms for host" ON public.study_rooms FOR UPDATE TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete study rooms for host" ON public.study_rooms;
CREATE POLICY "Allow delete study rooms for host" ON public.study_rooms FOR DELETE TO authenticated USING (host_id = auth.uid());

-- 6.12 daily_checkins policies
DROP POLICY IF EXISTS "Allow select daily_checkins for owner" ON public.daily_checkins;
CREATE POLICY "Allow select daily_checkins for owner" ON public.daily_checkins FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert daily_checkins for owner" ON public.daily_checkins;
CREATE POLICY "Allow insert daily_checkins for owner" ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow update daily_checkins for owner" ON public.daily_checkins;
CREATE POLICY "Allow update daily_checkins for owner" ON public.daily_checkins FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete daily_checkins for owner" ON public.daily_checkins;
CREATE POLICY "Allow delete daily_checkins for owner" ON public.daily_checkins FOR DELETE TO authenticated USING (user_id = auth.uid());
