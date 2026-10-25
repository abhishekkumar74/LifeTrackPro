-- ========================================================
-- LifeTrack Pro: Master Curriculum & Storage-Optimized Progress Migration
-- File: master_curriculum_and_progress_migration.sql
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. MASTER TABLES (Global curriculum, shared across all students)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'student',
  exam_type TEXT NOT NULL DEFAULT 'entrance' CHECK (exam_type IN ('entrance', 'sarkari', 'board', 'professional', 'other')),
  popularity_score INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  icon_name TEXT DEFAULT 'book',
  color TEXT DEFAULT '#5B4FE8',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT,
  color TEXT NOT NULL DEFAULT '#5B4FE8',
  icon_name TEXT DEFAULT 'book',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  display_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.exam_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id UUID NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_hours INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================================
-- 2. STORAGE-OPTIMIZED STUDENT PROGRESS TABLES (Zero-Duplication)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.user_exam_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  exam_slug TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam_id)
);

CREATE TABLE IF NOT EXISTS public.user_chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.exam_chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('in_progress', 'done')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

-- ========================================================
-- 3. INDEXES FOR LIGHTNING FAST QUERIES
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_exams_slug ON public.exams(slug);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_id ON public.exam_subjects(exam_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_exam_chapters_subject_id ON public.exam_chapters(exam_subject_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user ON public.user_exam_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_chapter_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_chapter ON public.user_chapter_progress(chapter_id);

-- ========================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exam_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chapter_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read exams" ON public.exams;
CREATE POLICY "Public read exams" ON public.exams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read exam_subjects" ON public.exam_subjects;
CREATE POLICY "Public read exam_subjects" ON public.exam_subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read exam_chapters" ON public.exam_chapters;
CREATE POLICY "Public read exam_chapters" ON public.exam_chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own enrollments" ON public.user_exam_enrollments;
CREATE POLICY "Users manage own enrollments" ON public.user_exam_enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own progress" ON public.user_chapter_progress;
CREATE POLICY "Users manage own progress" ON public.user_chapter_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========================================================
-- 5. IDEMPOTENT CURRICULUM SEEDING (All 16 Master Exams)
-- ========================================================
DO $$
DECLARE
  v_exam_id UUID;
  v_subject_id UUID;
  v_es_id UUID;
BEGIN
  -- ------------------------------------------------------
  -- Exam: NEET UG (neet)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('NEET UG', 'neet', 'student', 'entrance', 990, 'Medical entrance for MBBS/BDS aspirants', '#10B981', 'activity', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Physics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Physics', 'PHY', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Physics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Physics in NEET UG
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Units & Measurements', 1, 4),
    (v_es_id, 'Kinematics & Motion', 2, 8),
    (v_es_id, 'Laws of Motion', 3, 10),
    (v_es_id, 'Work, Energy & Power', 4, 8),
    (v_es_id, 'Rotational Motion', 5, 12),
    (v_es_id, 'Gravitation', 6, 6),
    (v_es_id, 'Thermodynamics', 7, 10),
    (v_es_id, 'Electrostatics', 8, 12),
    (v_es_id, 'Current Electricity', 9, 10),
    (v_es_id, 'Ray & Wave Optics', 10, 14);

  -- Subject: Chemistry
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Chemistry', 'CHEM', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Chemistry', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Chemistry in NEET UG
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Structure of Atom', 1, 6),
    (v_es_id, 'Chemical Bonding', 2, 10),
    (v_es_id, 'Thermodynamics', 3, 8),
    (v_es_id, 'Equilibrium', 4, 10),
    (v_es_id, 'Solutions & Electrochemistry', 5, 12),
    (v_es_id, 'Organic Chemistry Basics', 6, 14),
    (v_es_id, 'Hydrocarbons', 7, 8),
    (v_es_id, 'Biomolecules & Polymers', 8, 6);

  -- Subject: Biology
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Biology', 'BIO', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Biology', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Biology in NEET UG
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Diversity in Living World', 1, 8),
    (v_es_id, 'Cell: Structure & Function', 2, 10),
    (v_es_id, 'Human Physiology', 3, 20),
    (v_es_id, 'Plant Physiology', 4, 14),
    (v_es_id, 'Genetics & Evolution', 5, 18),
    (v_es_id, 'Biotechnology & Applications', 6, 8),
    (v_es_id, 'Ecology & Environment', 7, 10);

  -- ------------------------------------------------------
  -- Exam: JEE Main (jee-main)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('JEE Main', 'jee-main', 'student', 'entrance', 980, 'Engineering entrance examination for NITs and IIITs', '#3B82F6', 'cpu', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in JEE Main
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Quadratic Equations & Complex Numbers', 1, 8),
    (v_es_id, 'Matrices & Determinants', 2, 6),
    (v_es_id, 'Coordinate Geometry', 3, 16),
    (v_es_id, 'Differential & Integral Calculus', 4, 25),
    (v_es_id, 'Vectors & 3D Geometry', 5, 12),
    (v_es_id, 'Probability & Statistics', 6, 8);

  -- Subject: Physics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Physics', 'PHY', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Physics', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Physics in JEE Main
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Mechanics & Newton Laws', 1, 14),
    (v_es_id, 'Rotational Dynamics', 2, 12),
    (v_es_id, 'Electromagnetism & AC', 3, 16),
    (v_es_id, 'Modern Physics & Semiconductors', 4, 10);

  -- Subject: Chemistry
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Chemistry', 'CHEM', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Chemistry', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Chemistry in JEE Main
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Physical Chemistry', 1, 15),
    (v_es_id, 'Inorganic & Coordination Compounds', 2, 15),
    (v_es_id, 'Organic Reaction Mechanisms', 3, 18);

  -- ------------------------------------------------------
  -- Exam: JEE Advanced (jee-advanced)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('JEE Advanced', 'jee-advanced', 'student', 'entrance', 950, 'Premier IIT Entrance Examination', '#6366F1', 'zap', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in JEE Advanced
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Advanced Calculus', 1, 20),
    (v_es_id, 'Vectors & Geometry', 2, 15),
    (v_es_id, 'Combinatorics & Probability', 3, 12);

  -- Subject: Physics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Physics', 'PHY', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Physics', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Physics in JEE Advanced
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Advanced Mechanics', 1, 20),
    (v_es_id, 'Electrodynamics', 2, 18);

  -- Subject: Chemistry
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Chemistry', 'CHEM', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Chemistry', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Chemistry in JEE Advanced
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Organic Syntheses', 1, 20),
    (v_es_id, 'Thermodynamics & Kinetics', 2, 15);

  -- ------------------------------------------------------
  -- Exam: B.Tech Computer Science (CSE) (btech-cse)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('B.Tech Computer Science (CSE)', 'btech-cse', 'student', 'professional', 970, 'Complete 4-Year B.Tech CSE Curriculum: DSA, Core CS, System Design & SDE Placements', '#6366F1', 'code', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Data Structures & Algorithms
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Data Structures & Algorithms', 'DSA', '#5B4FE8', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Data Structures & Algorithms', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Data Structures & Algorithms in B.Tech Computer Science (CSE)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Arrays & Strings', 1, 10),
    (v_es_id, 'Linked List', 2, 8),
    (v_es_id, 'Stack & Queue', 3, 8),
    (v_es_id, 'Recursion & Backtracking', 4, 10),
    (v_es_id, 'Trees & Binary Search Trees', 5, 15),
    (v_es_id, 'Graphs & Algorithms', 6, 18),
    (v_es_id, 'Dynamic Programming', 7, 20);

  -- Subject: Computer Science Fundamentals
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Computer Science Fundamentals', 'CS_CORE', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Computer Science Fundamentals', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Computer Science Fundamentals in B.Tech Computer Science (CSE)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Operating Systems', 1, 12),
    (v_es_id, 'Computer Networks', 2, 12),
    (v_es_id, 'Database Management Systems (DBMS)', 3, 12),
    (v_es_id, 'System Design & High Level Architecture', 4, 15);

  -- Subject: Backend & System Design
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Backend & System Design', 'BACKEND', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Backend & System Design', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Backend & System Design in B.Tech Computer Science (CSE)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Java & Spring Boot Development', 1, 15),
    (v_es_id, 'REST APIs & Microservices', 2, 12),
    (v_es_id, 'Low Level Design & Design Patterns', 3, 15);

  -- ------------------------------------------------------
  -- Exam: UPSC CSE (upsc-cse)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('UPSC CSE', 'upsc-cse', 'student', 'sarkari', 970, 'Civil Services Examination (IAS, IPS, IFS)', '#D97706', 'award', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: General Studies 1
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies 1', 'GS1', '#D97706', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies 1', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Studies 1 in UPSC CSE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Modern Indian History', 1, 20),
    (v_es_id, 'Art & Culture', 2, 15),
    (v_es_id, 'Physical & Human Geography', 3, 25),
    (v_es_id, 'Indian Society & Diversity', 4, 10);

  -- Subject: General Studies 2
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies 2', 'GS2', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies 2', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Studies 2 in UPSC CSE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Constitution & Polity', 1, 30),
    (v_es_id, 'Governance & Social Justice', 2, 15),
    (v_es_id, 'International Relations', 3, 18);

  -- Subject: General Studies 3
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies 3', 'GS3', '#059669', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies 3', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Studies 3 in UPSC CSE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Economy & Budgeting', 1, 25),
    (v_es_id, 'Agriculture & Food Processing', 2, 12),
    (v_es_id, 'Science & Technology', 3, 14),
    (v_es_id, 'Environment & Ecology', 4, 18),
    (v_es_id, 'Internal Security & Disaster Mgmt', 5, 12);

  -- Subject: Ethics (GS 4)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Ethics (GS 4)', 'GS4', '#7C3AED', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Ethics (GS 4)', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Ethics (GS 4) in UPSC CSE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Ethics & Human Interface', 1, 15),
    (v_es_id, 'Attitude & Aptitude', 2, 15),
    (v_es_id, 'Case Studies', 3, 20);

  -- Subject: CSAT
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('CSAT', 'CSAT', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'CSAT', 5)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for CSAT in UPSC CSE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Reading Comprehension', 1, 15),
    (v_es_id, 'Logical Reasoning', 2, 15),
    (v_es_id, 'Basic Numeracy', 3, 20);

  -- Subject: Current Affairs
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Current Affairs', 'CA', '#EF4444', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Current Affairs', 6)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Current Affairs in UPSC CSE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Monthly Magazine Revision', 1, 20),
    (v_es_id, 'Daily Newspaper Analysis', 2, 30);

  -- ------------------------------------------------------
  -- Exam: SSC CGL (ssc-cgl)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('SSC CGL', 'ssc-cgl', 'student', 'sarkari', 940, 'Combined Graduate Level Examination for Central Ministries', '#059669', 'shield', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Quantitative Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Quantitative Aptitude', 'QA', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Quantitative Aptitude', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Quantitative Aptitude in SSC CGL
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Arithmetic (Percentage, Profit/Loss, SI/CI)', 1, 20),
    (v_es_id, 'Algebra & Number System', 2, 15),
    (v_es_id, 'Geometry & Mensuration', 3, 20),
    (v_es_id, 'Trigonometry & DI', 4, 15);

  -- Subject: Reasoning Ability
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Reasoning Ability', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Reasoning Ability', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Reasoning Ability in SSC CGL
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Analogies & Series', 1, 8),
    (v_es_id, 'Coding-Decoding & Blood Relations', 2, 8),
    (v_es_id, 'Syllogism & Non-Verbal', 3, 10);

  -- Subject: English Comprehension
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('English Comprehension', 'ENG', '#EC4899', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'English Comprehension', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for English Comprehension in SSC CGL
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Grammar Rules & Error Spotting', 1, 12),
    (v_es_id, 'Vocabulary & Idioms', 2, 15),
    (v_es_id, 'Reading Comprehension', 3, 10);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Awareness in SSC CGL
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'History & Polity', 1, 15),
    (v_es_id, 'Science & Geography', 2, 15),
    (v_es_id, 'Current Affairs GK', 3, 20);

  -- ------------------------------------------------------
  -- Exam: Class 12 Boards (class-12-boards)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('Class 12 Boards', 'class-12-boards', 'student', 'board', 930, 'CBSE / State Senior Secondary Examinations', '#0284C7', 'book-open', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Physics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Physics', 'PHY', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Physics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Physics in Class 12 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Electrostatics', 1, 10),
    (v_es_id, 'Current Electricity', 2, 10),
    (v_es_id, 'Magnetic Effects & AC', 3, 12),
    (v_es_id, 'Optics', 4, 14),
    (v_es_id, 'Modern Physics', 5, 10);

  -- Subject: Chemistry
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Chemistry', 'CHEM', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Chemistry', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Chemistry in Class 12 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Solutions', 1, 8),
    (v_es_id, 'Electrochemistry', 2, 10),
    (v_es_id, 'Chemical Kinetics', 3, 8),
    (v_es_id, 'Organic Compounds', 4, 18);

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in Class 12 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Matrices & Determinants', 1, 8),
    (v_es_id, 'Calculus (Continuity & Integration)', 2, 25),
    (v_es_id, '3D Geometry & Vectors', 3, 12),
    (v_es_id, 'Probability', 4, 8);

  -- Subject: English
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('English', 'ENG', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'English', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for English in Class 12 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Flamingo (Literature)', 1, 12),
    (v_es_id, 'Vistas (Supplementary)', 2, 10),
    (v_es_id, 'Writing Skills & Articles', 3, 8);

  -- ------------------------------------------------------
  -- Exam: Class 10 Boards (class-10-boards)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('Class 10 Boards', 'class-10-boards', 'student', 'board', 900, 'Secondary School Examinations', '#0D9488', 'book', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Science
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Science', 'SCI', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Science', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Science in Class 10 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Chemical Reactions & Equations', 1, 6),
    (v_es_id, 'Acids, Bases & Salts', 2, 6),
    (v_es_id, 'Life Processes', 3, 8),
    (v_es_id, 'Light - Reflection & Refraction', 4, 8),
    (v_es_id, 'Electricity', 5, 8);

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in Class 10 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Real Numbers & Polynomials', 1, 6),
    (v_es_id, 'Linear Equations & Quadratics', 2, 8),
    (v_es_id, 'Triangles & Trigonometry', 3, 12),
    (v_es_id, 'Surface Areas & Volumes', 4, 8);

  -- Subject: Social Science
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Social Science', 'SST', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Social Science', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Social Science in Class 10 Boards
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'History: Rise of Nationalism', 1, 8),
    (v_es_id, 'Geography: Resources & Agriculture', 2, 8),
    (v_es_id, 'Civics: Power Sharing & Federalism', 3, 6),
    (v_es_id, 'Economics: Development & Sectors', 4, 6);

  -- ------------------------------------------------------
  -- Exam: CAT (IIMs / MBA) (cat)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('CAT (IIMs / MBA)', 'cat', 'student', 'entrance', 910, 'Common Admission Test for MBA Admissions', '#7C3AED', 'trending-up', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Quantitative Aptitude (QA)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Quantitative Aptitude (QA)', 'QA', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Quantitative Aptitude (QA)', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Quantitative Aptitude (QA) in CAT (IIMs / MBA)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Arithmetic', 1, 20),
    (v_es_id, 'Algebra', 2, 18),
    (v_es_id, 'Geometry', 3, 15),
    (v_es_id, 'Number System', 4, 12);

  -- Subject: Data Interpretation & LR
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Data Interpretation & LR', 'DILR', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Data Interpretation & LR', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Data Interpretation & LR in CAT (IIMs / MBA)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Tables & Charts', 1, 15),
    (v_es_id, 'Arrangements & Puzzles', 2, 20),
    (v_es_id, 'Games & Tournaments', 3, 10);

  -- Subject: Verbal Ability & RC (VARC)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Verbal Ability & RC (VARC)', 'VARC', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Verbal Ability & RC (VARC)', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Verbal Ability & RC (VARC) in CAT (IIMs / MBA)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Reading Comprehension Passages', 1, 25),
    (v_es_id, 'Para Jumbles & Summaries', 2, 15);

  -- ------------------------------------------------------
  -- Exam: GATE (gate)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('GATE', 'gate', 'student', 'entrance', 890, 'Graduate Aptitude Test in Engineering', '#EC4899', 'terminal', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Engineering Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Engineering Mathematics', 'EM', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Engineering Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Engineering Mathematics in GATE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Linear Algebra & Calculus', 1, 12),
    (v_es_id, 'Probability & Discrete Math', 2, 14);

  -- Subject: General Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Aptitude', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Aptitude', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Aptitude in GATE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Numerical Ability', 1, 10),
    (v_es_id, 'Verbal Ability', 2, 8);

  -- Subject: Core Technical Engineering
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Core Technical Engineering', 'TECH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Core Technical Engineering', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Core Technical Engineering in GATE
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Core Subject Module 1', 1, 25),
    (v_es_id, 'Core Subject Module 2', 2, 25);

  -- ------------------------------------------------------
  -- Exam: IBPS PO / Clerk (ibps-po)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('IBPS PO / Clerk', 'ibps-po', 'student', 'sarkari', 880, 'Public Sector Banking Probationary Officer & Clerical', '#2563EB', 'landmark', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Quantitative Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Quantitative Aptitude', 'QA', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Quantitative Aptitude', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Quantitative Aptitude in IBPS PO / Clerk
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Simplification & Approximation', 1, 10),
    (v_es_id, 'Number Series & Quadratic Equations', 2, 10),
    (v_es_id, 'Data Interpretation', 3, 18);

  -- Subject: Reasoning Ability
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Reasoning Ability', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Reasoning Ability', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Reasoning Ability in IBPS PO / Clerk
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Seating Arrangement & Puzzles', 1, 25),
    (v_es_id, 'Inequalities & Syllogism', 2, 8);

  -- Subject: English Language
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('English Language', 'ENG', '#EC4899', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'English Language', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for English Language in IBPS PO / Clerk
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Cloze Test & Reading Comprehension', 1, 15),
    (v_es_id, 'Error Detection & Sentence Correction', 2, 12);

  -- Subject: Banking & Financial Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Banking & Financial Awareness', 'BANK', '#059669', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Banking & Financial Awareness', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Banking & Financial Awareness in IBPS PO / Clerk
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'RBI Guidelines & Monetary Policy', 1, 12),
    (v_es_id, 'Current Financial News', 2, 15);

  -- ------------------------------------------------------
  -- Exam: CUET UG (cuet)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('CUET UG', 'cuet', 'student', 'entrance', 870, 'Central University Entrance Test', '#F59E0B', 'compass', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Language (English/Hindi)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Language (English/Hindi)', 'LANG', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Language (English/Hindi)', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Language (English/Hindi) in CUET UG
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Reading & Vocabulary', 1, 15);

  -- Subject: Domain Specific Subjects
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Domain Specific Subjects', 'DOMAIN', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Domain Specific Subjects', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Domain Specific Subjects in CUET UG
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Class 12 NCERT Core', 1, 25);

  -- Subject: General Test
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Test', 'GT', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Test', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Test in CUET UG
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'General Knowledge & Reasoning', 1, 20);

  -- ------------------------------------------------------
  -- Exam: CA Foundation (ca-foundation)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('CA Foundation', 'ca-foundation', 'student', 'professional', 850, 'ICAI Chartered Accountancy Entry Level Examination', '#4F46E5', 'briefcase', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Accounting
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Accounting', 'ACC', '#4F46E5', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Accounting', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Accounting in CA Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Theoretical Framework & Accounting Process', 1, 12),
    (v_es_id, 'Bank Reconciliation & Depreciation', 2, 10),
    (v_es_id, 'Partnership Accounts & Company Accounts', 3, 25);

  -- Subject: Business Laws
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Business Laws', 'LAW', '#D97706', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Business Laws', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Business Laws in CA Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Regulatory Framework', 1, 8),
    (v_es_id, 'The Indian Contract Act 1872', 2, 20),
    (v_es_id, 'The Sale of Goods Act & Companies Act', 3, 18);

  -- Subject: Quantitative Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Quantitative Aptitude', 'QA', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Quantitative Aptitude', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Quantitative Aptitude in CA Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Business Mathematics & Time Value of Money', 1, 20),
    (v_es_id, 'Logical Reasoning', 2, 12),
    (v_es_id, 'Statistics & Probability', 3, 18);

  -- Subject: Business Economics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Business Economics', 'ECO', '#059669', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Business Economics', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Business Economics in CA Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Demand & Supply Analysis', 1, 10),
    (v_es_id, 'Theory of Production & Cost', 2, 12),
    (v_es_id, 'Price Determination in Markets', 3, 10),
    (v_es_id, 'Indian Economy & Business Cycles', 4, 12);

  -- ------------------------------------------------------
  -- Exam: NDA & NA (nda)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('NDA & NA', 'nda', 'student', 'sarkari', 860, 'National Defence Academy & Naval Academy Examination', '#7C3AED', 'shield-check', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in NDA & NA
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Algebra, Matrices & Determinants', 1, 15),
    (v_es_id, 'Trigonometry & Calculus', 2, 20),
    (v_es_id, 'Vector Algebra & Statistics', 3, 15);

  -- Subject: General Ability Test (GAT)
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Ability Test (GAT)', 'GAT', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Ability Test (GAT)', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Ability Test (GAT) in NDA & NA
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'English (Grammar & Comprehension)', 1, 15),
    (v_es_id, 'General Science (Physics/Chem/Bio)', 2, 20),
    (v_es_id, 'History, Freedom Movement & Geography', 3, 20),
    (v_es_id, 'Current Events', 4, 15);

  -- ------------------------------------------------------
  -- Exam: CLAT (Law Entrance) (clat)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('CLAT (Law Entrance)', 'clat', 'student', 'entrance', 840, 'Common Law Admission Test for NLUs', '#EF4444', 'scale', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Legal Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Legal Reasoning', 'LEGAL', '#EF4444', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Legal Reasoning', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Legal Reasoning in CLAT (Law Entrance)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Constitutional Law Passages', 1, 15),
    (v_es_id, 'Torts, Criminal & Contract Law', 2, 20);

  -- Subject: Current Affairs & GK
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Current Affairs & GK', 'GK', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Current Affairs & GK', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Current Affairs & GK in CLAT (Law Entrance)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'National & International Law Events', 1, 20);

  -- Subject: Logical Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Logical Reasoning', 'LR', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Logical Reasoning', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Logical Reasoning in CLAT (Law Entrance)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Critical Reasoning & Arguments', 1, 18);

  -- ------------------------------------------------------
  -- Exam: CS Foundation (cs-foundation)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('CS Foundation', 'cs-foundation', 'student', 'professional', 800, 'ICSI Company Secretary Foundation Course', '#7C2D12', 'file-text', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Business Environment & Law
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Business Environment & Law', 'BEL', '#4F46E5', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Business Environment & Law', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Business Environment & Law in CS Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Business Law Concepts', 1, 18);

  -- Subject: Business Management & Ethics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Business Management & Ethics', 'BME', '#059669', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Business Management & Ethics', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Business Management & Ethics in CS Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Management Principles & Ethics', 1, 15);

  -- Subject: Business Economics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Business Economics', 'BECO', '#D97706', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Business Economics', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Business Economics in CS Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Economics & Statistics', 1, 15);

  -- Subject: Fundamentals of Accounting
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Fundamentals of Accounting', 'ACC', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Fundamentals of Accounting', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Fundamentals of Accounting in CS Foundation
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Accounting & Auditing', 1, 18);

  -- ------------------------------------------------------
  -- Exam: RRB NTPC & Group D (Railways) (rrb-ntpc)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('RRB NTPC & Group D (Railways)', 'rrb-ntpc', 'student', 'sarkari', 950, 'Railway Recruitment Board Non-Technical Popular Categories & Group D', '#DC2626', 'train', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in RRB NTPC & Group D (Railways)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number System, Decimals & Fractions', 1, 10),
    (v_es_id, 'LCM, HCF & Simplification', 2, 8),
    (v_es_id, 'Ratio, Proportion & Percentage', 3, 12),
    (v_es_id, 'Time & Work, Pipes & Cisterns', 4, 12),
    (v_es_id, 'Time, Speed & Distance, Trains', 5, 12),
    (v_es_id, 'Simple & Compound Interest', 6, 10),
    (v_es_id, 'Profit, Loss & Discount', 7, 10),
    (v_es_id, 'Algebra, Geometry & Trigonometry', 8, 15),
    (v_es_id, 'Mensuration (2D & 3D)', 9, 12),
    (v_es_id, 'Elementary Statistics & Data Interpretation', 10, 10);

  -- Subject: General Intelligence & Reasoning
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Intelligence & Reasoning', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Intelligence & Reasoning in RRB NTPC & Group D (Railways)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Analogies & Alphabetical Series', 1, 8),
    (v_es_id, 'Coding-Decoding & Blood Relations', 2, 10),
    (v_es_id, 'Mathematical Operations & Syllogism', 3, 8),
    (v_es_id, 'Venn Diagram, Puzzles & Data Sufficiency', 4, 12),
    (v_es_id, 'Statement-Conclusions & Decision Making', 5, 8),
    (v_es_id, 'Non-Verbal & Direction Sense', 6, 8);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Awareness in RRB NTPC & Group D (Railways)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Current Events of National & International Importance', 1, 20),
    (v_es_id, 'General Science (Physics, Chemistry, Life Sciences up to 10th CBSE)', 2, 25),
    (v_es_id, 'History of India & Freedom Struggle', 3, 15),
    (v_es_id, 'Indian Geography & Environment', 4, 15),
    (v_es_id, 'Indian Polity & Governance', 5, 15),
    (v_es_id, 'Indian Economy & General Scientific Knowledge', 6, 12);

  -- ------------------------------------------------------
  -- Exam: SSC CHSL & MTS (ssc-chsl)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('SSC CHSL & MTS', 'ssc-chsl', 'student', 'sarkari', 935, 'Staff Selection Commission 10+2 CHSL & Multi-Tasking Staff Exam', '#059669', 'shield', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Quantitative Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Quantitative Aptitude', 'QA', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Quantitative Aptitude', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Quantitative Aptitude in SSC CHSL & MTS
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Number Systems & Arithmetic Basics', 1, 15),
    (v_es_id, 'Percentage, Profit-Loss & Interest', 2, 15),
    (v_es_id, 'Time-Work, Speed-Time-Distance', 3, 12),
    (v_es_id, 'Basic Algebra & Geometry', 4, 14),
    (v_es_id, 'Mensuration & Data Interpretation', 5, 12);

  -- Subject: Reasoning Ability
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Reasoning Ability', 'REAS', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Reasoning Ability', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Reasoning Ability in SSC CHSL & MTS
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Semantic & Symbolic Analogies', 1, 8),
    (v_es_id, 'Number Series & Coding-Decoding', 2, 8),
    (v_es_id, 'Venn Diagrams & Blood Relations', 3, 8),
    (v_es_id, 'Paper Folding, Mirror Images & Non-Verbal', 4, 10);

  -- Subject: English Comprehension
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('English Comprehension', 'ENG', '#EC4899', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'English Comprehension', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for English Comprehension in SSC CHSL & MTS
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Spotting Errors & Sentence Improvement', 1, 12),
    (v_es_id, 'Synonyms, Antonyms & One Word Substitution', 2, 15),
    (v_es_id, 'Idioms, Phrases & Cloze Test', 3, 12),
    (v_es_id, 'Reading Comprehension', 4, 10);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Awareness in SSC CHSL & MTS
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'History, Culture & Freedom Movement', 1, 14),
    (v_es_id, 'Geography & Environment', 2, 12),
    (v_es_id, 'Indian Polity & Constitution', 3, 12),
    (v_es_id, 'General Science & Daily Current Affairs', 4, 18);

  -- ------------------------------------------------------
  -- Exam: CDS (Combined Defence Services) (cds)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('CDS (Combined Defence Services)', 'cds', 'student', 'sarkari', 915, 'UPSC Combined Defence Services Examination for Army, Navy & Air Force Officers', '#D97706', 'shield-check', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: Mathematics
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#2563EB', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for Mathematics in CDS (Combined Defence Services)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Arithmetic & Number Theory', 1, 15),
    (v_es_id, 'Algebra & Quadratic Equations', 2, 12),
    (v_es_id, 'Trigonometry & Heights/Distances', 3, 14),
    (v_es_id, 'Geometry (Lines, Angles, Triangles, Circles)', 4, 18),
    (v_es_id, 'Mensuration (Areas & Volumes)', 5, 14),
    (v_es_id, 'Statistics & Frequency Distributions', 6, 8);

  -- Subject: English Comprehension
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('English Comprehension', 'ENG', '#EC4899', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'English Comprehension', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for English Comprehension in CDS (Combined Defence Services)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Spotting Errors & Sentence Completion', 1, 12),
    (v_es_id, 'Ordering of Words & Sentences', 2, 10),
    (v_es_id, 'Synonyms & Antonyms', 3, 12),
    (v_es_id, 'Reading Comprehension Passages', 4, 12);

  -- Subject: General Awareness
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Awareness', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Awareness in CDS (Combined Defence Services)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Physics & Chemistry (Everyday Science)', 1, 15),
    (v_es_id, 'Biology & Health Sciences', 2, 12),
    (v_es_id, 'Indian History & Modern Movement', 3, 15),
    (v_es_id, 'Geography of India & the World', 4, 14),
    (v_es_id, 'Indian Polity, Defence News & Current Affairs', 5, 18);

  -- ------------------------------------------------------
  -- Exam: State PCS (BPSC / UPPSC / MPPSC) (state-pcs)
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)
  VALUES ('State PCS (BPSC / UPPSC / MPPSC)', 'state-pcs', 'student', 'sarkari', 925, 'State Public Service Commission Civil Services Examination', '#7C3AED', 'landmark', true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    popularity_score = EXCLUDED.popularity_score,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon_name = EXCLUDED.icon_name
  RETURNING id INTO v_exam_id;

  -- Subject: General Studies 1
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies 1', 'GS1', '#8B5CF6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies 1', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Studies 1 in State PCS (BPSC / UPPSC / MPPSC)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'History of India & National Movement', 1, 20),
    (v_es_id, 'Art, Culture & Heritage', 2, 12),
    (v_es_id, 'Indian & World Geography', 3, 18),
    (v_es_id, 'State Specific History, Geography & Culture', 4, 25);

  -- Subject: General Studies 2
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies 2', 'GS2', '#3B82F6', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies 2', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Studies 2 in State PCS (BPSC / UPPSC / MPPSC)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Constitution & Political System', 1, 20),
    (v_es_id, 'Panchayati Raj & Public Policy', 2, 12),
    (v_es_id, 'State Administrative Structure', 3, 12);

  -- Subject: General Studies 3
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Studies 3', 'GS3', '#10B981', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'General Studies 3', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for General Studies 3 in State PCS (BPSC / UPPSC / MPPSC)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian Economy & State Budget/Economy', 1, 18),
    (v_es_id, 'General Science & Tech in Development', 2, 15),
    (v_es_id, 'Environment, Ecology & Disaster Management', 3, 14);

  -- Subject: CSAT & Aptitude
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('CSAT & Aptitude', 'CSAT', '#F59E0B', 'book')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_subject_id;

  -- Exam-Subject Link
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_exam_id, v_subject_id, 'CSAT & Aptitude', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index
  RETURNING id INTO v_es_id;

  -- Chapters for CSAT & Aptitude in State PCS (BPSC / UPPSC / MPPSC)
  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Reading Comprehension & Interpersonal Skills', 1, 12),
    (v_es_id, 'Logical Reasoning & Analytical Ability', 2, 14),
    (v_es_id, 'Basic Numeracy & Data Interpretation', 3, 15);

END $$;
