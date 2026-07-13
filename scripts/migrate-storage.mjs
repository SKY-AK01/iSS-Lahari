import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://zzqyhghfxijbqfvivlha.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_KEY;

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SECRET_KEY;

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

const BUCKETS = ['papers-pdf', 'papers-images'];

async function migrateStorage() {
  console.log('🚀 Starting Storage Migration...');

  for (const bucket of BUCKETS) {
    console.log(`\n📦 Processing Bucket: ${bucket}`);

    // 1. Create bucket in the new DB if it doesn't exist
    const { data: existingBuckets } = await newDb.storage.listBuckets();
    const exists = existingBuckets?.find(b => b.name === bucket);

    if (!exists) {
      const { error: createErr } = await newDb.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      if (createErr) {
        console.error(`❌ Failed to create bucket ${bucket} in new DB:`, createErr);
        continue;
      }
      console.log(`✅ Created bucket '${bucket}' in new DB.`);
    } else {
      console.log(`⚠️ Bucket '${bucket}' already exists in new DB.`);
    }

    // 2. List all files in the old bucket
    console.log(`🔍 Listing files in old '${bucket}'...`);
    const { data: files, error: listErr } = await oldDb.storage.from(bucket).list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (listErr) {
      console.error(`❌ Failed to list files in old ${bucket}:`, listErr);
      continue;
    }

    if (!files || files.length === 0) {
      console.log(`⚠️ No files found in '${bucket}'.`);
      continue;
    }

    // Filter out the empty folder placeholder ('.emptyFolderPlaceholder' or similar)
    const validFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id);
    console.log(`⏳ Found ${validFiles.length} files to migrate.`);

    // 3. Download from Old & Upload to New
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      console.log(`   [${i + 1}/${validFiles.length}] Migrating: ${file.name}`);

      // Check if it already exists in new bucket
      const { data: existingFiles } = await newDb.storage.from(bucket).list('', {
        search: file.name
      });
      if (existingFiles && existingFiles.find(f => f.name === file.name)) {
        console.log(`      ⏭️ Already exists in new DB. Skipping.`);
        continue;
      }

      // Download
      const { data: fileData, error: downloadErr } = await oldDb.storage.from(bucket).download(file.name);
      if (downloadErr || !fileData) {
        console.error(`      ❌ Download failed:`, downloadErr);
        continue;
      }

      // Upload
      const { error: uploadErr } = await newDb.storage.from(bucket).upload(file.name, fileData, {
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        upsert: true
      });

      if (uploadErr) {
        console.error(`      ❌ Upload failed:`, uploadErr);
      } else {
        console.log(`      ✅ Success.`);
      }
    }
  }

  console.log('\n🎉 Storage Migration Complete!');
}

migrateStorage();
