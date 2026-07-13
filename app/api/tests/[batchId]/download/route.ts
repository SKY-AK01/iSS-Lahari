import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PastedTestJSON } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Forbidden — mentor only' }, { status: 403 });

  try {
    const { batchId } = await params;
    
    // Fetch batch with chapter, subject, and questions
    const { data: batch, error } = await supabase
      .from('test_batches')
      .select(`
        batch_number,
        chapter:chapters (
          name,
          subject:subjects ( name )
        ),
        questions (
          external_id, type, difficulty, question, options, answer, explanation,
          keywords, related, memory_trick, exam_trap, sources, sort_order
        )
      `)
      .eq('id', batchId)
      .single();

    if (error || !batch) throw new Error(error?.message || 'Batch not found');
    
    // Sort questions by sort_order
    const sortedQuestions = [...(batch.questions as any[])].sort((a, b) => a.sort_order - b.sort_order);

    const jsonOutput: PastedTestJSON = {
      subject: (batch.chapter as any).subject.name,
      chapter: (batch.chapter as any).name,
      batch: batch.batch_number,
      questions: sortedQuestions.map((q: any) => ({
        id: q.external_id,
        difficulty: q.difficulty,
        type: q.type,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        keywords: q.keywords,
        related: q.related,
        memory_trick: q.memory_trick,
        exam_trap: q.exam_trap,
        sources: q.sources,
      })),
    };

    return new NextResponse(JSON.stringify(jsonOutput, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="test_batch_${batch.batch_number}.json"`,
      },
    });
  } catch (e) {
    console.error('Download test error:', e);
    return NextResponse.json({ error: (e as Error).message ?? 'Unknown error' }, { status: 500 });
  }
}
