import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PastedTestJSON } from '@/lib/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Forbidden — mentor only' }, { status: 403 });

  const body: PastedTestJSON = await req.json();

  try {
    // 1. Upsert subject
    const { data: subject, error: sErr } = await supabase
      .from('subjects')
      .upsert({ name: body.subject }, { onConflict: 'name' })
      .select('id')
      .single();
    if (sErr) throw sErr;

    // 2. Upsert chapter
    const { data: chapter, error: cErr } = await supabase
      .from('chapters')
      .upsert({ subject_id: subject.id, name: body.chapter }, { onConflict: 'subject_id,name' })
      .select('id')
      .single();
    if (cErr) throw cErr;

    // 3. Count difficulty mix
    const mix: Record<string, number> = {};
    for (const q of body.questions) {
      mix[q.difficulty] = (mix[q.difficulty] || 0) + 1;
    }

    // 4. Upsert test_batch
    const { data: batch, error: bErr } = await supabase
      .from('test_batches')
      .upsert(
        { chapter_id: chapter.id, batch_number: body.batch, question_count: body.questions.length, difficulty_mix: mix },
        { onConflict: 'chapter_id,batch_number' }
      )
      .select('id')
      .single();
    if (bErr) throw bErr;

    // 5. Delete old questions for this batch (replacing)
    await supabase.from('questions').delete().eq('batch_id', batch.id);

    // 6. Insert questions
    const qRows = body.questions.map((q, i) => {
      // Normalise `related`: new format is an object, old format was a string[]
      // Store as-is (jsonb column accepts both); just ensure null if missing
      const related = q.related ?? null;

      return {
        batch_id: batch.id,
        external_id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options ?? null,
        answer: q.answer,
        explanation: q.explanation ?? null,
        keywords: q.keywords ?? null,
        related,
        memory_trick: q.memory_trick ?? null,
        exam_trap: q.exam_trap ?? null,
        sources: q.sources ?? null,
        sort_order: i,
      };
    });

    const { error: qErr } = await supabase.from('questions').insert(qRows);
    if (qErr) throw qErr;

    return NextResponse.json({ ok: true, batchId: batch.id });
  } catch (e) {
    console.error('Save test error:', e);
    return NextResponse.json({ error: (e as Error).message ?? 'Unknown error' }, { status: 500 });
  }
}
