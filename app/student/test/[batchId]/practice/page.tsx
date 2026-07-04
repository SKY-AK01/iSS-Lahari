import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PracticeClient from '@/components/PracticeClient';

export default async function PracticePage({ params, searchParams }: { params: Promise<{ batchId: string }>, searchParams: Promise<{ attemptId?: string }> }) {
  const { batchId } = await params;
  const { attemptId } = await searchParams;
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

  // Sort questions by sort_order implicitly or just use as returned
  const questions = batch.questions.sort((a, b) => a.id.localeCompare(b.id)); // simple sort for consistency

  const { data: existingAnswersData } = await supabase
    .from('attempt_answers')
    .select('*')
    .eq('attempt_id', attemptId);

  return <PracticeClient batch={batch} questions={questions} attemptId={attemptId} existingAnswers={existingAnswersData || []} />;
}
