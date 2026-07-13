import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PracticeClient from '@/components/PracticeClient';

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const { batchId } = await params;
  const { attemptId } = await searchParams;
  if (!attemptId) notFound();

  const supabase = await createClient();

  // Fetch batch+questions and existing answers in parallel
  const [{ data: batch }, { data: existingAnswersData }] = await Promise.all([
    supabase
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
      .single(),
    supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId),
  ]);

  if (!batch) notFound();

  // Sort by sort_order (correct field), fallback to 0
  const questions = [...batch.questions].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  return (
    <PracticeClient
      batch={batch}
      questions={questions}
      attemptId={attemptId}
      existingAnswers={existingAnswersData || []}
    />
  );
}
