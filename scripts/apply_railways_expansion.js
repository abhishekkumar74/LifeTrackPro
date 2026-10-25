const fs = require('fs');
const path = require('path');
const { RAILWAYS_EXPANSION_EXAMS } = require('./railways_expansion_data');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zvfeafmixnevqbelxnqp';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

function escapeSql(str) {
  if (typeof str !== 'string') return "''";
  return `'${str.replace(/'/g, "''")}'`;
}

function buildSql() {
  const lines = [
    '--',
    '-- RAILWAYS & POLICE CATALOGUE EXPANSION MIGRATION',
    '-- Idempotent & Zero-Duplicate architecture',
    '--',
    'BEGIN;',
    '',
    '-- Temporary variables block for dynamic IDs',
    'DO $$',
    'DECLARE',
    '  v_exam_id UUID;',
    '  v_subject_id UUID;',
    '  v_es_id UUID;',
    'BEGIN',
  ];

  for (const exam of RAILWAYS_EXPANSION_EXAMS) {
    lines.push(`  -- ----------------------------------------------------`);
    lines.push(`  -- EXAM: ${exam.name} (${exam.slug})`);
    lines.push(`  -- ----------------------------------------------------`);
    lines.push(`  INSERT INTO public.exams (name, slug, category, exam_type, popularity_score, description, color, icon_name, is_active)`);
    lines.push(`  VALUES (`);
    lines.push(`    ${escapeSql(exam.name)},`);
    lines.push(`    ${escapeSql(exam.slug)},`);
    lines.push(`    ${escapeSql(exam.category)},`);
    lines.push(`    ${escapeSql(exam.exam_type)},`);
    lines.push(`    ${exam.popularity_score},`);
    lines.push(`    ${escapeSql(exam.description)},`);
    lines.push(`    ${escapeSql(exam.color)},`);
    lines.push(`    ${escapeSql(exam.icon_name || 'book')},`);
    lines.push(`    true`);
    lines.push(`  )`);
    lines.push(`  ON CONFLICT (slug) DO UPDATE SET`);
    lines.push(`    name = EXCLUDED.name,`);
    lines.push(`    category = EXCLUDED.category,`);
    lines.push(`    exam_type = EXCLUDED.exam_type,`);
    lines.push(`    popularity_score = EXCLUDED.popularity_score,`);
    lines.push(`    description = EXCLUDED.description,`);
    lines.push(`    color = EXCLUDED.color,`);
    lines.push(`    icon_name = EXCLUDED.icon_name,`);
    lines.push(`    is_active = true,`);
    lines.push(`    updated_at = NOW()`);
    lines.push(`  RETURNING id INTO v_exam_id;`);
    lines.push(``);

    for (const sub of exam.subjects) {
      lines.push(`  -- Subject: ${sub.name}`);
      lines.push(`  INSERT INTO public.subjects (name, code, color, icon_name)`);
      lines.push(`  VALUES (${escapeSql(sub.name)}, ${escapeSql(sub.code || null)}, ${escapeSql(sub.color)}, 'book')`);
      lines.push(`  ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color`);
      lines.push(`  RETURNING id INTO v_subject_id;`);
      lines.push(``);

      lines.push(`  -- Exam Subject Mapping`);
      lines.push(`  INSERT INTO public.exam_subjects (exam_id, subject_id, display_name, order_index)`);
      lines.push(`  VALUES (v_exam_id, v_subject_id, ${escapeSql(sub.name)}, ${sub.order_index})`);
      lines.push(`  ON CONFLICT (exam_id, subject_id) DO UPDATE SET`);
      lines.push(`    display_name = EXCLUDED.display_name,`);
      lines.push(`    order_index = EXCLUDED.order_index`);
      lines.push(`  RETURNING id INTO v_es_id;`);
      lines.push(``);

      lines.push(`  -- Chapters for ${exam.slug} -> ${sub.name}`);
      lines.push(`  DELETE FROM public.exam_chapters WHERE exam_subject_id = v_es_id;`);
      lines.push(`  INSERT INTO public.exam_chapters (exam_subject_id, name, order_index, estimated_hours) VALUES`);

      const chapterTuples = sub.chapters.map((ch, idx) => {
        const isLast = idx === sub.chapters.length - 1;
        return `    (v_es_id, ${escapeSql(ch.name)}, ${ch.order_index}, ${ch.estimated_hours || 8})${isLast ? ';' : ','}`;
      });

      lines.push(chapterTuples.join('\n'));
      lines.push(``);
    }
  }

  lines.push('END $$;');
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');

  return lines.join('\n');
}

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
  console.log('🚀 Generating Railways & Police Catalogue Expansion SQL...');
  const sql = buildSql();
  const sqlPath = path.join(__dirname, '..', 'supabase', 'railways_expansion_migration.sql');
  fs.writeFileSync(sqlPath, sql, 'utf8');
  console.log(`💾 Saved SQL migration to ${sqlPath} (${sql.length} bytes, ${RAILWAYS_EXPANSION_EXAMS.length} exams)`);

  console.log(`\n⚡ Applying live migration to Supabase project: ${PROJECT_REF}...`);
  try {
    await runQuery(sql);
    console.log('✅ Migration applied successfully on Supabase!');

    console.log('\n📊 Auditing Railway & Police categories in Supabase:');
    const auditSql = `
      SELECT 
        e.name AS exam_name,
        e.slug AS exam_slug,
        e.popularity_score,
        count(DISTINCT es.id) AS subjects_count,
        count(ec.id) AS chapters_count
      FROM public.exams e
      LEFT JOIN public.exam_subjects es ON es.exam_id = e.id
      LEFT JOIN public.exam_chapters ec ON ec.exam_subject_id = es.id
      WHERE e.slug IN (
        'rrb-ntpc',
        'rrb-alp',
        'rrb-technician',
        'rrb-je',
        'rpf-constable',
        'rpf-si',
        'rrb-ministerial',
        'rrb-paramedical',
        'rrb-section-controller'
      )
      GROUP BY e.id, e.name, e.slug, e.popularity_score
      ORDER BY e.popularity_score DESC;
    `;

    const auditResult = await runQuery(auditSql);
    console.table(auditResult);

    const totalStatsSql = `
      SELECT 
        (SELECT count(*) FROM public.exams) as total_exams,
        (SELECT count(*) FROM public.subjects) as total_subjects,
        (SELECT count(*) FROM public.exam_subjects) as total_exam_subjects,
        (SELECT count(*) FROM public.exam_chapters) as total_exam_chapters;
    `;
    const totals = await runQuery(totalStatsSql);
    console.log('\n📈 Overall Database Row Totals:');
    console.table(totals);

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

main();
