import { createClient } from '@supabase/supabase-js';

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SECRET_KEY;
const db = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

async function fix() {
  // Set Aakash as mentor
  const { error: e1 } = await db.from('profiles')
    .update({ role: 'mentor' })
    .eq('name', 'Aakash');
  console.log('Aakash → mentor:', e1 ? `❌ ${e1.message}` : '✅');

  // Check study_materials table exists
  const { data, error: e2 } = await db.from('study_materials').select('id').limit(1);
  console.log('study_materials table:', e2 ? `❌ ${e2.message}` : `✅ (${data?.length} rows)`);

  // Print final profiles
  const { data: profiles } = await db.from('profiles').select('name, role');
  console.log('\nFinal profiles:');
  profiles?.forEach(p => console.log(`  ${p.name}: ${p.role}`));
}

fix();
