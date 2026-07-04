import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { attemptId, questionId, studentAnswer, verdict, aiFeedback, aiDetailedExplanation, marksAwarded } = body;

  try {
    // 1. Verify attempt belongs to user
    const { data: attempt, error: fetchErr } = await supabase
      .from('attempts')
      .select('id')
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .single();

    if (fetchErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 404 });
    }

    // 2. Upsert answer
    const { error: upsertErr } = await supabase
      .from('attempt_answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          student_answer: studentAnswer,
          verdict: verdict,
          ai_feedback: aiFeedback,
          ai_detailed_explanation: aiDetailedExplanation,
          marks_awarded: marksAwarded,
        },
        { onConflict: 'attempt_id,question_id' }
      );

    if (upsertErr) throw upsertErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Save answer error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
