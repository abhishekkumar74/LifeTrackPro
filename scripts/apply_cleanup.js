const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

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
  console.log('🚀 Executing Database Optimization & Dead Data Purge...');

  const sqlPath = path.join(__dirname, '..', 'supabase', 'database_cleanup_and_auto_triggers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await runQuery(sql);
    console.log('✅ Cleanup SQL & Triggers executed successfully!\n');

    console.log('🔍 Checking new post-cleanup table row counts:');
    const verifySql = `
      SELECT 'syllabus_topics' AS table_name, count(*) AS count FROM public.syllabus_topics
      UNION ALL
      SELECT 'study_rooms', count(*) FROM public.study_rooms
      UNION ALL
      SELECT 'room_messages', count(*) FROM public.room_messages
      UNION ALL
      SELECT 'schedule_logs', count(*) FROM public.schedule_logs
      UNION ALL
      SELECT 'user_chapter_progress', count(*) FROM public.user_chapter_progress
      UNION ALL
      SELECT 'user_exam_enrollments', count(*) FROM public.user_exam_enrollments;
    `;
    const counts = await runQuery(verifySql);
    console.table(counts);

    const sizeSql = `
      SELECT 
        relname AS table_name,
        n_live_tup AS estimated_rows,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname IN ('syllabus_topics', 'study_rooms', 'room_messages', 'schedule_logs')
      ORDER BY pg_total_relation_size(relid) DESC;
    `;
    const sizes = await runQuery(sizeSql);
    console.table(sizes);

    console.log('\n🎉 ALL DONE! Database is lean, clean, and self-cleaning!');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  }
}

main();
