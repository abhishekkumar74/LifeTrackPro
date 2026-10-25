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

async function audit() {
  console.log('🔍 Starting comprehensive database audit for LifeTrack Pro...');

  // 1. Get all public tables
  const tablesSql = `
    SELECT 
      table_name,
      (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const tables = await runQuery(tablesSql);
  console.log('\n📋 Public Tables Found (' + tables.length + '):');
  console.table(tables);

  // 2. Get row counts and approximate size for each table
  const countSql = `
    SELECT 
      schemaname,
      relname AS table_name,
      n_live_tup AS estimated_rows,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_size_pretty(pg_relation_size(relid)) AS data_size,
      pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(relid) DESC;
  `;
  const sizes = await runQuery(countSql);
  console.log('\n💾 Table Sizes & Estimated Rows:');
  console.table(sizes);

  // 3. Database overall size
  const dbSizeSql = `
    SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;
  `;
  const dbSize = await runQuery(dbSizeSql);
  console.log('\n📦 Total Database Size:', dbSize[0].database_size);
}

audit().catch(console.error);
