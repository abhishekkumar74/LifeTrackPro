const fs = require('fs');
const path = require('path');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zvfeafmixnevqbelxnqp';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

async function runQuery(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!response.ok) {
    throw new Error(`Supabase API error (${response.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  console.log('🚀 Starting direct Supabase migration...');
  console.log(`Target Project: ${PROJECT_REF}`);

  const migrationFilePath = path.join(__dirname, '..', 'supabase', 'master_curriculum_and_progress_migration.sql');
  const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');

  console.log(`📄 Read migration SQL (${sqlContent.length} characters)...`);
  console.log('⚡ Executing SQL on Supabase...');

  try {
    const result = await runQuery(sqlContent);
    console.log('✅ Migration executed successfully!');
    if (result) console.log('API Response:', JSON.stringify(result).substring(0, 300));

    console.log('\n🔍 Verifying created tables and seed content...');

    const verifySql = `
      SELECT 'exams' AS table_name, count(*) AS count FROM public.exams
      UNION ALL
      SELECT 'subjects', count(*) FROM public.subjects
      UNION ALL
      SELECT 'exam_subjects', count(*) FROM public.exam_subjects
      UNION ALL
      SELECT 'exam_chapters', count(*) FROM public.exam_chapters
      UNION ALL
      SELECT 'user_exam_enrollments', count(*) FROM public.user_exam_enrollments
      UNION ALL
      SELECT 'user_chapter_progress', count(*) FROM public.user_chapter_progress;
    `;

    const verifyResult = await runQuery(verifySql);
    console.log('📊 Table Row Counts:');
    console.table(verifyResult);

    const checkChaptersSql = `
      SELECT 
        e.name AS exam_name,
        COALESCE(es.display_name, s.name) AS subject_name,
        count(ec.id) AS chapter_count
      FROM public.exams e
      JOIN public.exam_subjects es ON es.exam_id = e.id
      JOIN public.subjects s ON s.id = es.subject_id
      LEFT JOIN public.exam_chapters ec ON ec.exam_subject_id = es.id
      GROUP BY e.name, COALESCE(es.display_name, s.name), es.order_index
      ORDER BY e.name, es.order_index;
    `;

    const chaptersResult = await runQuery(checkChaptersSql);
    console.log('\n📚 Curriculum Breakdown:');
    console.table(chaptersResult);

    console.log('\n🎉 ALL DONE! Supabase database is completely set up!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
