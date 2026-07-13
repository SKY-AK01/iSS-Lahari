import { createClient } from '@supabase/supabase-js';

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SECRET_KEY;
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Existing users from the Sydney project
const USERS = [
  { email: 'laharikrishnag72@gmail.com', name: 'Lahari' },
  { email: 'suryapadayachi58@gmail.com', name: 'Surya' },
  { email: 'aakash20030501@gmail.com', name: 'Aakash' }
];

const TEMP_PASSWORD = 'Lahari@2026';

async function migrateAuth() {
  console.log('🚀 Starting Auth Migration...');

  for (const user of USERS) {
    console.log(`\n📦 Processing User: ${user.email}`);

    // Check if user already exists
    const { data: { users }, error: listErr } = await newDb.auth.admin.listUsers();
    if (listErr) {
      console.error(`❌ Failed to list users:`, listErr);
      return;
    }

    const existing = users.find(u => u.email === user.email);
    if (existing) {
      console.log(`⚠️ User '${user.email}' already exists in new DB.`);
      continue;
    }

    // Create User
    const { data, error } = await newDb.auth.admin.createUser({
      email: user.email,
      password: TEMP_PASSWORD,
      email_confirm: true, // Auto-confirm their email
      user_metadata: { name: user.name }
    });

    if (error) {
      console.error(`❌ Failed to create user ${user.email}:`, error);
    } else {
      console.log(`✅ Created user '${user.email}' with temporary password.`);
    }
  }

  console.log('\n🎉 Auth Migration Complete!');
}

migrateAuth();
