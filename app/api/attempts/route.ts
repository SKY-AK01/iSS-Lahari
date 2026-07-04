import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { batchId, mode, examDurationMinutes, markingCorrect, markingWrong, markingPartial } = body;

  try {
    const { data: batch } = await supabase
      .from('test_batches')
      .select('question_count')
      .eq('id', batchId)
      .single();

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    const maxScore = batch.question_count * (markingCorrect || 2);

    const { data: attempt, error } = await supabase
      .from('attempts')
      .insert({
        student_id: user.id,
        batch_id: batchId,
        mode,
        exam_duration_minutes: examDurationMinutes || null,
        marking_correct: markingCorrect || 2,
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
