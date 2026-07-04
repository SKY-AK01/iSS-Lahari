import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { attemptId, answers, score, percentage } = body;

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

    // 2. Update attempt record
    const { error: updateErr } = await supabase
      .from('attempts')
      .update({
        score,
        percentage,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', attemptId);

    if (updateErr) throw updateErr;

    // 3. Insert attempt answers
    if (answers && answers.length > 0) {
      const { error: answersErr } = await supabase
        .from('attempt_answers')
        .insert(
          answers.map((ans: any) => ({
            attempt_id: attemptId,
            question_id: ans.questionId,
            student_answer: ans.studentAnswer,
            verdict: ans.verdict,
            ai_feedback: ans.aiFeedback,
            marks_awarded: ans.marksAwarded,
          }))
        );
      
      if (answersErr) throw answersErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Submit attempt error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
