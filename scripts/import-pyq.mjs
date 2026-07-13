/**
 * import-pyq.mjs
 * Imports all app_data papers + questions into Supabase.
 * Run: node scripts/import-pyq.mjs
 *
 * Uses SUPABASE_SECRET_KEY to bypass RLS.
 * Safe to re-run — skips papers/questions that already exist.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load .env.local
config({ path: new URL('../.env.local', import.meta.url).pathname });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY; // service role — from .env.local

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DATA  = path.resolve(__dirname, '../app_data');
const PDF_BASE  = `${SUPABASE_URL}/storage/v1/object/public/papers-pdf`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function upsertPaper(paperName, meta, totalQuestions) {
  const pdfUrl = meta.pdf_filename ? `${PDF_BASE}/${paperName}/${meta.pdf_filename}` : null;
  const { data, error } = await supabase
    .from('papers')
    .upsert({
      paper_name:      paperName,
      paper_title:     meta.paper_title ?? null,
      year:            meta.year,
      exam_type:       meta.exam_type,
      pdf_url:         pdfUrl,
      has_images:      meta.images_dir != null,
      total_questions: totalQuestions,
    }, { onConflict: 'paper_name' })
    .select('id')
    .single();

  if (error) throw new Error(`Paper upsert failed [${paperName}]: ${error.message}`);
  return data.id;
}

async function insertQuestion(paperId, parentId, q, sortOrder) {
  const { data, error } = await supabase
    .from('pyq_questions')
    .insert({
      paper_id:        paperId,
      parent_id:       parentId ?? null,
      question_number: q.question_number,
      question_type:   q.question_type ?? null,
      page_start:      q.page_start ?? null,
      page_end:        q.page_end   ?? null,
      images:          (q.images  && q.images.length  > 0) ? q.images  : null,
      tables:          (q.tables  && q.tables.length  > 0) ? q.tables  : null,
      marks:           q.marks      ?? null,
      word_limit:      q.word_limit ?? null,
      sort_order:      sortOrder,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Question insert failed [Q${q.question_number}]: ${error.message}`);
  return data.id;
}

async function insertContent(questionId, lang, content) {
  if (!content) return;
  const { passage, question, statements, options } = content;
  // Skip if all fields are empty
  if (!passage && !question && !statements?.length && !options?.length) return;

  const { error } = await supabase
    .from('pyq_question_content')
    .upsert({
      question_id:   questionId,
      language:      lang,
      passage:       passage   ?? null,
      question_text: question  ?? null,
      statements:    (statements && statements.length > 0) ? statements : null,
      options:       (options   && options.length   > 0) ? options   : null,
    }, { onConflict: 'question_id,language' });

  if (error) throw new Error(`Content insert failed [${lang}]: ${error.message}`);
}

async function paperAlreadyImported(paperId) {
  const { count } = await supabase
    .from('pyq_questions')
    .select('id', { count: 'exact', head: true })
    .eq('paper_id', paperId);
  return (count ?? 0) > 0;
}

// ── Main ──────────────────────────────────────────────────────
async function importPaper(paperName) {
  const dir      = path.join(APP_DATA, paperName);
  const jsonFile = path.join(dir, `${paperName}.json`);

  if (!fs.existsSync(jsonFile)) {
    console.log(`  ⚠  No JSON found, skipping`);
    return;
  }

  const raw  = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const meta = raw.metadata;
  const qs   = raw.questions ?? [];

  // Upsert paper row
  const paperId = await upsertPaper(paperName, meta, qs.length);

  // Skip if questions already exist
  if (await paperAlreadyImported(paperId)) {
    console.log(`  ✓  Already imported (${qs.length} questions) — skipping`);
    return;
  }

  console.log(`  → Importing ${qs.length} questions…`);

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];

    // Insert top-level question
    const qId = await insertQuestion(paperId, null, q, i + 1);

    // Insert bilingual content
    await insertContent(qId, 'english', q.english);
    await insertContent(qId, 'hindi',   q.hindi);

    // Insert sub-questions
    if (q.sub_questions && q.sub_questions.length > 0) {
      for (let j = 0; j < q.sub_questions.length; j++) {
        const sq   = q.sub_questions[j];
        const sqId = await insertQuestion(paperId, qId, sq, j + 1);
        await insertContent(sqId, 'english', sq.english);
        await insertContent(sqId, 'hindi',   sq.hindi);
      }
    }

    // Small delay every 10 questions to avoid rate limits
    if (i > 0 && i % 10 === 0) await sleep(200);
  }

  console.log(`  ✓  Done (${qs.length} questions imported)`);
}

async function main() {
  const folders = fs.readdirSync(APP_DATA)
    .filter(f => fs.statSync(path.join(APP_DATA, f)).isDirectory())
    .sort();

  console.log(`Found ${folders.length} papers to process\n`);

  for (const folder of folders) {
    console.log(`[${folder}]`);
    try {
      await importPaper(folder);
    } catch (err) {
      console.error(`  ✗  ERROR: ${err.message}`);
    }
  }

  console.log('\nAll done!');
}

main();
