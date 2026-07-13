import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import StudentResultsClient from '@/components/StudentResultsClient';

export default async function StudentResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from('attempts')
    .select(`
      id, mode, score, max_score, percentage,
      marking_correct, marking_wrong, marking_partial,
      student:profiles(name),
      batch:test_batches(
        batch_number,
        chapter:chapters(name, subject:subjects(name))
      ),
      attempt_answers(
        student_answer, verdict, ai_feedback, marks_awarded,
        question:questions(
          id, type, difficulty, question, options, answer, explanation,
          keywords, related, memory_trick, exam_trap, sources, sort_order
        )
      )
    `)
    .eq('id', attemptId)
    .single();

  if (!attempt) notFound();

  // Sort answers by question sort_order, fallback to 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answers = [...attempt.attempt_answers].sort((a: any, b: any) =>
    (a.question?.sort_order ?? 0) - (b.question?.sort_order ?? 0)
  );

  return <StudentResultsClient attempt={{ ...attempt, attempt_answers: answers }} />;
}
