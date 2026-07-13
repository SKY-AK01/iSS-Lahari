import { createClient } from '@supabase/supabase-js';

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SECRET_KEY;
const db = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function diagnose() {
  console.log('🔍 Diagnosing new DB...\n');

  // Check subjects
  const { data: subjects, error: subErr } = await db.from('subjects').select('*');
  console.log(`📚 subjects: ${subjects?.length ?? 0} rows`, subErr ? `❌ ${subErr.message}` : '✅');

  // Check chapters
  const { data: chapters, error: chapErr } = await db.from('chapters').select('*');
  console.log(`📖 chapters: ${chapters?.length ?? 0} rows`, chapErr ? `❌ ${chapErr.message}` : '✅');

  // Check test_batches
  const { data: batches, error: batchErr } = await db.from('test_batches').select('*');
  console.log(`📝 test_batches: ${batches?.length ?? 0} rows`, batchErr ? `❌ ${batchErr.message}` : '✅');

  // Check questions
  const { data: questions, error: qErr } = await db.from('questions').select('id', { count: 'exact', head: true });
  console.log(`❓ questions: ${questions?.length ?? 0} rows`, qErr ? `❌ ${qErr.message}` : '✅');

  // Check profiles
  const { data: profiles, error: profErr } = await db.from('profiles').select('*');
  console.log(`\n👤 profiles:`);
  if (profErr) console.log('  ❌ Error:', profErr.message);
  else profiles?.forEach(p => console.log(`  - ${p.id} | ${p.name} | role: ${p.role}`));

  // Check auth users
  const { data: { users } } = await db.auth.admin.listUsers();
  console.log(`\n🔑 auth.users (${users.length}):`);
  users.forEach(u => {
    const hasProfile = profiles?.find(p => p.id === u.id);
    console.log(`  - ${u.email} | profile: ${hasProfile ? `✅ (${hasProfile.role})` : '❌ MISSING'}`);
  });
}

diagnose();
