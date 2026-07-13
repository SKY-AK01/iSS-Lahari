import { createClient } from '@supabase/supabase-js';

/**
 * Migration Script: Old Supabase (Sydney) -> New Supabase (Mumbai)
 *
 * IMPORTANT:
 * 1. You MUST run the SQL schemas in your NEW Supabase dashboard first:
 *    - `supabase/schema.sql`
 *    - `Data/pyq-schema.sql`
 * 2. Fill in the FULL unredacted secret keys below.
 * 3. Run this script using: `node scripts/migrate-supabase.mjs`
 */

const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://zzqyhghfxijbqfvivlha.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_KEY;

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SECRET_KEY;

if (!OLD_KEY || !NEW_KEY) {
  console.error('❌ ERROR: Set OLD_SUPABASE_KEY and SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Ordered by dependency (parents first)
const TABLES = [
  'subjects',
  'chapters',
  'test_batches',
  'questions',
  'papers',
  'pyq_questions',
  'pyq_question_content'
];

async function migrate() {
  console.log('🚀 Starting Database Migration...');

  for (const table of TABLES) {
    console.log(`\n📦 Migrating table: ${table}`);
    
    // 1. Fetch from Old
    const { data: rows, error: fetchErr } = await oldDb.from(table).select('*');
    if (fetchErr) {
      console.error(`❌ Failed to fetch ${table} from old DB:`, fetchErr);
      continue;
    }
    
    if (!rows || rows.length === 0) {
      console.log(`⚠️  No records found in ${table}, skipping.`);
      continue;
    }
    
    console.log(`⏳ Found ${rows.length} rows in ${table}. Pushing to new DB...`);
    
    // 2. Push to New
    const { error: pushErr } = await newDb.from(table).insert(rows);
    if (pushErr) {
      console.error(`❌ Failed to push ${table} to new DB:`, pushErr);
      console.log('Row sample:', rows[0]);
    } else {
      console.log(`✅ Successfully migrated ${rows.length} rows to ${table}.`);
    }
  }

  console.log('\n🎉 Migration Complete! Check your new Mumbai Supabase dashboard.');
  console.log('NOTE: Storage buckets (papers-pdf, papers-images) and Auth users need to be migrated manually if required.');
}

migrate();
