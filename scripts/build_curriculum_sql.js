const fs = require('fs');
const path = require('path');

function loadSeedExams() {
  let code = fs.readFileSync(path.join(__dirname, '..', 'lib', 'constants', 'exams-seed.ts'), 'utf8');
  code = code.replace(/export type [^;]+;/g, '');
  code = code.replace(/export interface [^{]+{[^}]+}/gs, '');
  code = code.replace(/export const SEED_EXAMS:\s*SeedExam\[\]\s*=/, 'const SEED_EXAMS =');
  code += '\nmodule.exports = { SEED_EXAMS };';
  const m = { exports: {} };
  const fn = new Function('module', 'exports', code);
  fn(m, m.exports);
  return m.exports.SEED_EXAMS;
}

const SEED_EXAMS = loadSeedExams();

function escapeSql(str) {
  if (!str) return "''";
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql() {
  const lines = [];

  lines.push(`-- ========================================================`);
  lines.push(`-- LifeTrack Pro: Master Curriculum & Storage-Optimized Progress Migration`);
  lines.push(`-- File: master_curriculum_and_progress_migration.sql`);
  lines.push(`-- ========================================================`);
  lines.push(``);
  lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  lines.push(``);

  // 1. Master Tables
  lines.push(`-- ========================================================`);
  lines.push(`-- 1. MASTER TABLES (Global curriculum, shared across all students)`);
  lines.push(`-- ========================================================`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS public.exams (`);
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  name TEXT NOT NULL,`);
  lines.push(`  slug TEXT UNIQUE NOT NULL,`);
  lines.push(`  category TEXT NOT NULL DEFAULT 'student',`);
  lines.push(`  exam_type TEXT NOT NULL DEFAULT 'entrance' CHECK (exam_type IN ('entrance', 'sarkari', 'board', 'professional', 'other')),`);
  lines.push(`  popularity_score INTEGER NOT NULL DEFAULT 100,`);
  lines.push(`  description TEXT,`);
  lines.push(`  icon_name TEXT DEFAULT 'book',`);
  lines.push(`  color TEXT DEFAULT '#5B4FE8',`);
  lines.push(`  is_active BOOLEAN NOT NULL DEFAULT true,`);
  lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS public.subjects (`);
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  name TEXT UNIQUE NOT NULL,`);
  lines.push(`  code TEXT,`);
  lines.push(`  color TEXT NOT NULL DEFAULT '#5B4FE8',`);
  lines.push(`  icon_name TEXT DEFAULT 'book',`);
  lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS public.exam_subjects (`);
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,`);
  lines.push(`  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,`);
  lines.push(`  display_name TEXT,`);
  lines.push(`  order_index INTEGER NOT NULL DEFAULT 0,`);
  lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  UNIQUE(exam_id, subject_id)`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS public.exam_chapters (`);
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  exam_subject_id UUID NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,`);
  lines.push(`  name TEXT NOT NULL,`);
  lines.push(`  order_index INTEGER NOT NULL DEFAULT 0,`);
  lines.push(`  estimated_hours INTEGER DEFAULT 5,`);
  lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  lines.push(`);`);
  lines.push(``);

  // 2. Storage-Optimized Student Tracking Tables
  lines.push(`-- ========================================================`);
  lines.push(`-- 2. STORAGE-OPTIMIZED STUDENT PROGRESS TABLES (Zero-Duplication)`);
  lines.push(`-- ========================================================`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS public.user_exam_enrollments (`);
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,`);
  lines.push(`  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,`);
  lines.push(`  exam_slug TEXT NOT NULL,`);
  lines.push(`  is_primary BOOLEAN NOT NULL DEFAULT true,`);
  lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  UNIQUE(user_id, exam_id)`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS public.user_chapter_progress (`);
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,`);
  lines.push(`  chapter_id UUID NOT NULL REFERENCES public.exam_chapters(id) ON DELETE CASCADE,`);
  lines.push(`  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('in_progress', 'done')),`);
  lines.push(`  completed_at TIMESTAMPTZ,`);
  lines.push(`  notes TEXT,`);
  lines.push(`  revision_count INTEGER NOT NULL DEFAULT 0,`);
  lines.push(`  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),`);
  lines.push(`  UNIQUE(user_id, chapter_id)`);
  lines.push(`);`);
  lines.push(``);

  // 3. Indexes
  lines.push(`-- ========================================================`);
  lines.push(`-- 3. INDEXES FOR LIGHTNING FAST QUERIES`);
  lines.push(`-- ========================================================`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_exams_slug ON public.exams(slug);`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_id ON public.exam_subjects(exam_id, order_index ASC);`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_exam_chapters_subject_id ON public.exam_chapters(exam_subject_id, order_index ASC);`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_user_enrollments_user ON public.user_exam_enrollments(user_id);`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_chapter_progress(user_id);`);
  lines.push(`CREATE INDEX IF NOT EXISTS idx_user_progress_chapter ON public.user_chapter_progress(chapter_id);`);
  lines.push(``);

  // 4. RLS Policies
  lines.push(`-- ========================================================`);
  lines.push(`-- 4. ROW LEVEL SECURITY (RLS) POLICIES`);
  lines.push(`-- ========================================================`);
  lines.push(`ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE public.exam_chapters ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE public.user_exam_enrollments ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE public.user_chapter_progress ENABLE ROW LEVEL SECURITY;`);
  lines.push(``);
  lines.push(`DROP POLICY IF EXISTS "Public read exams" ON public.exams;`);
  lines.push(`CREATE POLICY "Public read exams" ON public.exams FOR SELECT USING (true);`);
  lines.push(`DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;`);
  lines.push(`CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);`);
  lines.push(`DROP POLICY IF EXISTS "Public read exam_subjects" ON public.exam_subjects;`);
  lines.push(`CREATE POLICY "Public read exam_subjects" ON public.exam_subjects FOR SELECT USING (true);`);
  lines.push(`DROP POLICY IF EXISTS "Public read exam_chapters" ON public.exam_chapters;`);
  lines.push(`CREATE POLICY "Public read exam_chapters" ON public.exam_chapters FOR SELECT USING (true);`);
  lines.push(``);
  lines.push(`DROP POLICY IF EXISTS "Users manage own enrollments" ON public.user_exam_enrollments;`);
  lines.push(`CREATE POLICY "Users manage own enrollments" ON public.user_exam_enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`);
  lines.push(``);
  lines.push(`DROP POLICY IF EXISTS "Users manage own progress" ON public.user_chapter_progress;`);
  lines.push(`CREATE POLICY "Users manage own progress" ON public.user_chapter_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`);
  lines.push(``);

  // 5. Seed Data Execution Block
  lines.push(`-- ========================================================`);
  lines.push(`-- 5. IDEMPOTENT CURRICULUM SEEDING (All 16 Master Exams)`);
  lines.push(`-- ========================================================`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  v_exam_id UUID;`);
  lines.push(`  v_subject_id UUID;`);
  lines.push(`  v_es_id UUID;`);
  lines.push(`BEGIN`);

  for (const exam of SEED_EXAMS) {
    lines.push(`  -- ------------------------------------------------------`);
    lines.push(`  -- Exam: ${exam.name} (${exam.slug})`);
    lines.push(`  -- ------------------------------------------------------`);
    lines.push(`  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)`);
    lines.push(`  VALUES (${escapeSql(exam.name)}, ${escapeSql(exam.slug)}, ${escapeSql(exam.category)}, ${escapeSql(exam.exam_type)}, ${exam.popularity_score}, ${escapeSql(exam.description)}, ${escapeSql(exam.color)}, ${escapeSql(exam.icon_name || 'book')}, true)`);
    lines.push(`  ON CONFLICT (slug) DO UPDATE SET`);
    lines.push(`    name = EXCLUDED.name,`);
    lines.push(`    popularity_score = EXCLUDED.popularity_score,`);
    lines.push(`    description = EXCLUDED.description,`);
    lines.push(`    color = EXCLUDED.color,`);
    lines.push(`    icon_name = EXCLUDED.icon_name`);
    lines.push(`  RETURNING id INTO v_exam_id;`);
    lines.push(``);

    for (let sIdx = 0; sIdx < exam.subjects.length; sIdx++) {
      const sub = exam.subjects[sIdx];
      lines.push(`  -- Subject: ${sub.name}`);
      lines.push(`  INSERT INTO public.subjects (name, code, color, icon_name)`);
      lines.push(`  VALUES (${escapeSql(sub.name)}, ${escapeSql(sub.code || null)}, ${escapeSql(sub.color)}, 'book')`);
      lines.push(`  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color`);
      lines.push(`  RETURNING id INTO v_subject_id;`);
      lines.push(``);

      lines.push(`  -- Exam-Subject Link`);
      lines.push(`  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)`);
      lines.push(`  VALUES (v_exam_id, v_subject_id, ${escapeSql(sub.name)}, ${sIdx + 1})`);
      lines.push(`  ON CONFLICT (exam_id, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, order_index = EXCLUDED.order_index`);
      lines.push(`  RETURNING id INTO v_es_id;`);
      lines.push(``);

      if (sub.chapters && sub.chapters.length > 0) {
        lines.push(`  -- Chapters for ${sub.name} in ${exam.name}`);
        lines.push(`  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;`);
        lines.push(`  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES`);
        const chRows = sub.chapters.map((ch, cIdx) => 
          `    (v_es_id, ${escapeSql(ch.name)}, ${cIdx + 1}, ${ch.estimated_hours || 5})`
        );
        lines.push(chRows.join(',\n') + ';');
        lines.push(``);
      }
    }
  }

  lines.push(`END $$;`);
  lines.push(``);

  const outPath = path.join(__dirname, '..', 'supabase', 'master_curriculum_and_progress_migration.sql');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('✅ Generated SQL migration at:', outPath);
  console.log(`📄 Total SQL Lines: ${lines.length}`);
}

generateSql();
