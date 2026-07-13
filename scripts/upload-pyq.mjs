/**
 * upload-pyq.mjs
 * Reads all JSON files from app_data/, uploads PDFs + images to Supabase Storage,
 * and inserts papers / questions / content into the database.
 *
 * Run from the project root:
 *   node scripts/upload-pyq.mjs
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY
 *   - pyq-schema.sql already applied in Supabase SQL Editor
 *   - Storage buckets 'papers-pdf' and 'papers-images' exist (public)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { config } from 'dotenv';

// Load env
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY; // service role key needed for storage uploads

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APP_DATA_DIR = join(process.cwd(), 'app_data');

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function uploadFile(bucket, storagePath, filePath, contentType) {
  // Check if already exists
  const { data: existing } = await supabase.storage.from(bucket).list(
    storagePath.includes('/') ? storagePath.substring(0, storagePath.lastIndexOf('/')) : '',
    { search: basename(storagePath) }
  );
  if (existing && existing.length > 0) {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return publicUrl;
  }

  const fileBuffer = readFileSync(filePath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.warn(`    ⚠️  Storage upload failed for ${storagePath}: ${error.message}`);
    return null;
  }
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return publicUrl;
}

async function insertQuestions(paperId, questions, parentId = null, startOrder = 0) {
  let order = startOrder;
  for (const q of questions) {
    order++;
    // Insert question row
    const { data: qRow, error: qErr } = await supabase
      .from('pyq_questions')
      .insert({
        paper_id:        paperId,
        parent_id:       parentId,
        question_number: q.question_number,
        question_type:   q.question_type ?? null,
        page_start:      q.page_start ?? null,
        page_end:        q.page_end ?? null,
        images:          (q.images && q.images.length > 0) ? q.images : null,
        tables:          (q.tables && q.tables.length > 0) ? q.tables : null,
        marks:           q.marks ?? null,
        word_limit:      q.word_limit ?? null,
        sort_order:      order,
      })
      .select('id')
      .single();

    if (qErr || !qRow) {
      console.warn(`    ⚠️  Failed to insert Q${q.question_number}: ${qErr?.message}`);
      continue;
    }

    // Insert bilingual content
    for (const lang of ['english', 'hindi']) {
      const content = q[lang];
      if (!content) continue;
      const { error: cErr } = await supabase.from('pyq_question_content').insert({
        question_id:   qRow.id,
        language:      lang,
        passage:       content.passage ?? null,
        question_text: content.question ?? null,
        statements:    (content.statements && content.statements.length > 0) ? content.statements : null,
        options:       (content.options && content.options.length > 0) ? content.options : null,
      });
      if (cErr) console.warn(`    ⚠️  Content insert failed for Q${q.question_number} (${lang}): ${cErr.message}`);
    }

    // Recurse into sub_questions
    if (q.sub_questions && q.sub_questions.length > 0) {
      await insertQuestions(paperId, q.sub_questions, qRow.id, 0);
    }
  }
  return order;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const folders = readdirSync(APP_DATA_DIR).filter(f => {
    const full = join(APP_DATA_DIR, f);
    return statSync(full).isDirectory();
  });

  console.log(`\n📂  Found ${folders.length} paper folders\n`);

  let success = 0, skipped = 0, failed = 0;

  for (const folder of folders) {
    const folderPath = join(APP_DATA_DIR, folder);
    const jsonPath   = join(folderPath, `${folder}.json`);
    const pdfPath    = join(folderPath, `${folder}.pdf`);
    const imagesDir  = join(folderPath, 'images');

    if (!existsSync(jsonPath)) {
      console.log(`⏭️  ${folder} — no JSON, skipping`);
      skipped++;
      continue;
    }

    // Check if already uploaded
    const { data: existing } = await supabase
      .from('papers')
      .select('id')
      .eq('paper_name', folder)
      .single();

    if (existing) {
      console.log(`✅  ${folder} — already in database, skipping`);
      skipped++;
      continue;
    }

    console.log(`📤  Processing ${folder}…`);

    let paper;
    try {
      paper = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.error(`    ❌  Failed to parse JSON: ${e.message}`);
      failed++;
      continue;
    }

    const meta = paper.metadata;

    // 1. Upload PDF
    let pdfUrl = null;
    if (existsSync(pdfPath)) {
      process.stdout.write(`    📄  Uploading PDF…`);
      pdfUrl = await uploadFile('papers-pdf', `${folder}.pdf`, pdfPath, 'application/pdf');
      console.log(pdfUrl ? ' ✓' : ' ✗');
    }

    // 2. Upload images
    const hasImages = existsSync(imagesDir);
    if (hasImages) {
      const imgFiles = readdirSync(imagesDir);
      process.stdout.write(`    🖼️  Uploading ${imgFiles.length} images…`);
      for (const img of imgFiles) {
        const imgPath = join(imagesDir, img);
        const ext = img.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        await uploadFile('papers-images', `${folder}/${img}`, imgPath, mime);
      }
      console.log(' ✓');
    }

    // 3. Insert paper row
    const totalQ = paper.questions?.length ?? 0;
    const { data: paperRow, error: paperErr } = await supabase
      .from('papers')
      .insert({
        paper_name:      folder,
        paper_title:     meta.paper_title ?? null,
        year:            meta.year,
        exam_type:       meta.exam_type,
        pdf_url:         pdfUrl,
        has_images:      hasImages,
        total_questions: totalQ,
      })
      .select('id')
      .single();

    if (paperErr || !paperRow) {
      console.error(`    ❌  Failed to insert paper row: ${paperErr?.message}`);
      failed++;
      continue;
    }

    // 4. Insert questions
    if (paper.questions && paper.questions.length > 0) {
      process.stdout.write(`    📝  Inserting ${totalQ} questions…`);
      await insertQuestions(paperRow.id, paper.questions);
      console.log(' ✓');
    }

    console.log(`    ✅  Done — ${folder}`);
    success++;

    // Small delay to avoid rate limiting
    await sleep(300);
  }

  console.log(`\n──────────────────────────────`);
  console.log(`✅  Uploaded:  ${success}`);
  console.log(`⏭️  Skipped:   ${skipped}`);
  console.log(`❌  Failed:    ${failed}`);
  console.log(`──────────────────────────────\n`);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
