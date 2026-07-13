import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    batchId,
    mode,
    examDurationMinutes,
    markingCorrect,
    markingWrong,
    markingPartial,
    questionCount, // passed from client to avoid an extra DB round-trip
  } = body;

  try {
    // If questionCount not provided by client, fetch it (fallback)
    let resolvedCount = questionCount;
    if (!resolvedCount) {
      const { data: batch } = await supabase
        .from('test_batches')
        .select('question_count')
        .eq('id', batchId)
        .single();
      if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      resolvedCount = batch.question_count;
    }

    const mc = markingCorrect || 2;
    const maxScore = resolvedCount * mc;

    const { data: attempt, error } = await supabase
      .from('attempts')
      .insert({
        student_id: user.id,
        batch_id: batchId,
        mode,
        exam_duration_minutes: examDurationMinutes || null,
        marking_correct: mc,
        marking_wrong: markingWrong || 0,
        marking_partial: markingPartial || 0,
        max_score: maxScore,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, attemptId: attempt.id });
  } catch (e) {
    console.error('Create attempt error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
