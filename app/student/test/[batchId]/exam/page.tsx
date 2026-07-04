import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ExamClient from '@/components/ExamClient';

export default async function ExamPage({ params, searchParams }: { params: Promise<{ batchId: string }>, searchParams: Promise<{ attemptId?: string; duration?: string }> }) {
  const { batchId } = await params;
  const { attemptId, duration } = await searchParams;
  if (!attemptId) notFound();

  const supabase = await createClient();

  const { data: batch } = await supabase
    .from('test_batches')
    .select(`
      id, batch_number,
      chapter:chapters(name, subject:subjects(name)),
      questions (
        id, batch_id, external_id, type, difficulty, question, options, answer, explanation,
        keywords, related, memory_trick, exam_trap, sources, sort_order
      )
    `)
    .eq('id', batchId)
    .single();

  if (!batch) notFound();
  
  const questions = batch.questions.sort((a, b) => a.id.localeCompare(b.id));

  return <ExamClient batch={batch} questions={questions} attemptId={attemptId} durationMinutes={Number(duration || 20)} />;
}
