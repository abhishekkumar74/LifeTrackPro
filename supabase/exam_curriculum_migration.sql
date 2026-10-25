-- ========================================================
-- LifeTrack Pro: Many-to-Many (M:N) Exam Curriculum Architecture
-- Migration: exam_curriculum_migration.sql
-- ========================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 0. CLEANUP PRIOR INCOMPLETE / OLD SCHEMAS (M:N MIGRATION)
-- ========================================================
-- Drops old tables if they existed with the previous 1:N schema
-- (e.g. where exam_subjects was missing the subject_id column)
DROP TABLE IF EXISTS public.exam_chapters CASCADE;
DROP TABLE IF EXISTS public.exam_subjects CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;

-- ========================================================
-- 1. TABLES DEFINITIONS
-- ========================================================

-- 1.1 Master Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'student',
  exam_type TEXT NOT NULL DEFAULT 'entrance' CHECK (exam_type IN ('entrance', 'sarkari', 'board', 'professional', 'other')),
  popularity_score INTEGER NOT NULL DEFAULT 100, -- Higher score = displayed higher in listing
  description TEXT,
  icon_name TEXT DEFAULT 'book',
  color TEXT DEFAULT '#5B4FE8',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Master Subjects Table (Centralized pool of subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- e.g. "Mathematics", "Physics", "Chemistry", "Quantitative Aptitude"
  code TEXT,                           -- e.g. "MATH", "PHY", "QA"
  color TEXT NOT NULL DEFAULT '#5B4FE8',
  icon_name TEXT DEFAULT 'book',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Many-to-Many Junction Table (Exam <--> Subject)
CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  display_name TEXT,                   -- Optional: custom display name for exam (e.g. "Quantitative Aptitude" vs "Mathematics")
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, subject_id)
);

-- 1.4 Exam Chapters Table (Linked to exam_subject junction)
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
-- 2. INDEXES
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_exams_active_type_score ON public.exams(is_active, exam_type, popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_id ON public.exam_subjects(exam_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject_id ON public.exam_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_chapters_exam_subject_id ON public.exam_chapters(exam_subject_id, order_index ASC);

-- ========================================================
-- 3. AUTOMATIC TIMESTAMP TRIGGERS
-- ========================================================

CREATE OR REPLACE FUNCTION public.update_curriculum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exams_updated_at ON public.exams;
CREATE TRIGGER trg_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_curriculum_updated_at();

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_curriculum_updated_at();

DROP TRIGGER IF EXISTS trg_exam_subjects_updated_at ON public.exam_subjects;
CREATE TRIGGER trg_exam_subjects_updated_at
  BEFORE UPDATE ON public.exam_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_curriculum_updated_at();

DROP TRIGGER IF EXISTS trg_exam_chapters_updated_at ON public.exam_chapters;
CREATE TRIGGER trg_exam_chapters_updated_at
  BEFORE UPDATE ON public.exam_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_curriculum_updated_at();

-- ========================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ========================================================

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read exams" ON public.exams;
CREATE POLICY "Allow read exams" ON public.exams FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Allow read subjects" ON public.subjects;
CREATE POLICY "Allow read subjects" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read exam_subjects" ON public.exam_subjects;
CREATE POLICY "Allow read exam_subjects" ON public.exam_subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read exam_chapters" ON public.exam_chapters;
CREATE POLICY "Allow read exam_chapters" ON public.exam_chapters FOR SELECT USING (true);

-- ========================================================
-- 5. TEST CONTENT SEEDS: JEE MAIN & SSC CGL
-- ========================================================

DO $$
DECLARE
  -- Master Subject IDs
  v_sub_math_id UUID;
  v_sub_phy_id UUID;
  v_sub_chem_id UUID;
  v_sub_qa_id UUID;
  v_sub_reas_id UUID;
  v_sub_eng_id UUID;
  v_sub_ga_id UUID;

  -- Exam IDs
  v_jee_id UUID;
  v_ssc_id UUID;

  -- Junction IDs
  v_es_id UUID;
BEGIN
  -- ------------------------------------------------------
  -- 5.1 Insert Master Subjects
  -- ------------------------------------------------------
  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Mathematics', 'MATH', '#8B5CF6', 'calculator')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_math_id;

  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Physics', 'PHY', '#3B82F6', 'zap')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_phy_id;

  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Chemistry', 'CHEM', '#F59E0B', 'flask')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_chem_id;

  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('Quantitative Aptitude', 'QA', '#2563EB', 'percent')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_qa_id;

  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Intelligence & Reasoning', 'REAS', '#7C3AED', 'brain')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_reas_id;

  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('English Comprehension', 'ENG', '#EC4899', 'book-open')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_eng_id;

  INSERT INTO public.subjects (name, code, color, icon_name)
  VALUES ('General Awareness', 'GA', '#10B981', 'globe')
  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO v_sub_ga_id;

  -- ------------------------------------------------------
  -- 5.2 Insert Exams: JEE Main & SSC CGL
  -- ------------------------------------------------------
  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name)
  VALUES ('JEE Main', 'jee-main', 'student', 'entrance', 980, 'Joint Entrance Examination for Engineering (NITs, IIITs & CFTIs)', '#3B82F6', 'cpu')
  ON CONFLICT (slug) DO UPDATE SET popularity_score = EXCLUDED.popularity_score, name = EXCLUDED.name
  RETURNING id INTO v_jee_id;

  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name)
  VALUES ('SSC CGL', 'ssc-cgl', 'student', 'sarkari', 940, 'Combined Graduate Level Examination for Central Ministries & Government Departments', '#059669', 'shield')
  ON CONFLICT (slug) DO UPDATE SET popularity_score = EXCLUDED.popularity_score, name = EXCLUDED.name
  RETURNING id INTO v_ssc_id;

  -- ------------------------------------------------------
  -- 5.3 JEE MAIN: Many-to-Many Junction & Chapters
  -- ------------------------------------------------------

  -- JEE Main <--> Mathematics
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_jee_id, v_sub_math_id, 'Mathematics', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Sets, Relations & Functions', 1, 6),
    (v_es_id, 'Complex Numbers & Quadratic Equations', 2, 8),
    (v_es_id, 'Matrices & Determinants', 3, 8),
    (v_es_id, 'Permutations & Combinations', 4, 6),
    (v_es_id, 'Coordinate Geometry (Lines & Circles)', 5, 14),
    (v_es_id, 'Conic Sections (Parabola, Ellipse, Hyperbola)', 6, 12),
    (v_es_id, 'Differential Calculus (Limits, Continuity & Derivatives)', 7, 18),
    (v_es_id, 'Integral Calculus (Definite & Indefinite)', 8, 20),
    (v_es_id, 'Differential Equations', 9, 8),
    (v_es_id, 'Vectors & 3D Geometry', 10, 12),
    (v_es_id, 'Probability & Statistics', 11, 8),
    (v_es_id, 'Trigonometry', 12, 10);

  -- JEE Main <--> Physics
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_jee_id, v_sub_phy_id, 'Physics', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Units & Dimensions', 1, 4),
    (v_es_id, 'Kinematics & Motion in 1D/2D', 2, 10),
    (v_es_id, 'Laws of Motion & Friction', 3, 10),
    (v_es_id, 'Work, Energy & Power', 4, 8),
    (v_es_id, 'Rotational Dynamics', 5, 14),
    (v_es_id, 'Gravitation', 6, 6),
    (v_es_id, 'Thermodynamics & Kinetic Theory', 7, 10),
    (v_es_id, 'Electrostatics & Capacitance', 8, 14),
    (v_es_id, 'Current Electricity', 9, 10),
    (v_es_id, 'Magnetic Effects of Current & Magnetism', 10, 12),
    (v_es_id, 'Electromagnetic Induction & AC', 11, 12),
    (v_es_id, 'Ray & Wave Optics', 12, 14),
    (v_es_id, 'Modern Physics & Dual Nature', 13, 10),
    (v_es_id, 'Semiconductor Electronics', 14, 8);

  -- JEE Main <--> Chemistry
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_jee_id, v_sub_chem_id, 'Chemistry', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Some Basic Concepts of Chemistry (Mole Concept)', 1, 6),
    (v_es_id, 'Structure of Atom', 2, 8),
    (v_es_id, 'Chemical Bonding & Molecular Structure', 3, 12),
    (v_es_id, 'Chemical Thermodynamics', 4, 10),
    (v_es_id, 'Chemical & Ionic Equilibrium', 5, 12),
    (v_es_id, 'Solutions & Electrochemistry', 6, 12),
    (v_es_id, 'Chemical Kinetics', 7, 8),
    (v_es_id, 'Coordination Compounds', 8, 10),
    (v_es_id, 'p-Block & d-Block Elements', 9, 12),
    (v_es_id, 'Organic Chemistry: General Principles (GOC)', 10, 15),
    (v_es_id, 'Hydrocarbons', 11, 10),
    (v_es_id, 'Haloalkanes, Alcohols & Carbonyl Compounds', 12, 16),
    (v_es_id, 'Amines & Biomolecules', 13, 10);

  -- ------------------------------------------------------
  -- 5.4 SSC CGL: Many-to-Many Junction & Chapters
  -- ------------------------------------------------------

  -- SSC CGL <--> Quantitative Aptitude
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_ssc_id, v_sub_qa_id, 'Quantitative Aptitude', 1)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Percentage & Fractions', 1, 8),
    (v_es_id, 'Profit, Loss & Discount', 2, 10),
    (v_es_id, 'Simple & Compound Interest', 3, 10),
    (v_es_id, 'Ratio, Proportion & Partnership', 4, 8),
    (v_es_id, 'Time & Work, Pipes & Cisterns', 5, 12),
    (v_es_id, 'Speed, Time & Distance (Boats & Trains)', 6, 12),
    (v_es_id, 'Average, Mixture & Alligation', 7, 8),
    (v_es_id, 'Number System & HCF/LCM', 8, 10),
    (v_es_id, 'Algebra & Surds/Indices', 9, 14),
    (v_es_id, 'Geometry & Triangles', 10, 18),
    (v_es_id, 'Mensuration (2D & 3D)', 11, 16),
    (v_es_id, 'Trigonometry & Height/Distance', 12, 14),
    (v_es_id, 'Data Interpretation (Graphs & Tables)', 13, 10);

  -- SSC CGL <--> General Intelligence & Reasoning
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_ssc_id, v_sub_reas_id, 'Reasoning Ability', 2)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Analogies & Classification', 1, 6),
    (v_es_id, 'Series Completion (Number, Letter)', 2, 8),
    (v_es_id, 'Coding-Decoding & Blood Relations', 3, 10),
    (v_es_id, 'Direction Sense & Distance', 4, 6),
    (v_es_id, 'Syllogism & Venn Diagrams', 5, 8),
    (v_es_id, 'Seating Arrangement & Puzzles', 6, 12),
    (v_es_id, 'Statement & Conclusions', 7, 8),
    (v_es_id, 'Non-Verbal Reasoning (Paper Folding, Mirror Images)', 8, 10);

  -- SSC CGL <--> English Comprehension
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_ssc_id, v_sub_eng_id, 'English Comprehension', 3)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Spotting Errors & Sentence Correction', 1, 14),
    (v_es_id, 'Fill in the Blanks & Cloze Test', 2, 10),
    (v_es_id, 'Synonyms, Antonyms & One Word Substitution', 3, 18),
    (v_es_id, 'Idioms & Phrases', 4, 12),
    (v_es_id, 'Active/Passive Voice & Narration', 5, 10),
    (v_es_id, 'Reading Comprehension Passages', 6, 12),
    (v_es_id, 'Para Jumbles & Sentence Rearrangement', 7, 8);

  -- SSC CGL <--> General Awareness
  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)
  VALUES (v_ssc_id, v_sub_ga_id, 'General Awareness', 4)
  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_es_id;

  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;
  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES
    (v_es_id, 'Indian History (Ancient, Medieval, Modern)', 1, 20),
    (v_es_id, 'Indian Polity & Constitution', 2, 18),
    (v_es_id, 'Geography (Physical, Indian, World)', 3, 16),
    (v_es_id, 'Indian Economy & Budget Basics', 4, 12),
    (v_es_id, 'General Science (Physics, Chemistry, Biology)', 5, 18),
    (v_es_id, 'Current Affairs & Static GK', 6, 25);

END $$;
