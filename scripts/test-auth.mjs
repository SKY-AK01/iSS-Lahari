import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://zzqyhghfxijbqfvivlha.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_KEY;

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });

async function test() {
  const { data, error } = await oldDb.auth.admin.listUsers();
  if (error) {
    console.error(error);
  } else {
    console.log(`Total users: ${data.users.length}`);
    console.log(data.users.map(u => u.email).join(', '));
  }
}
test();
