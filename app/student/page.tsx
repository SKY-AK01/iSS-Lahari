import { createClient } from '@/lib/supabase/server';
import StudentTestBrowser from '@/components/StudentTestBrowser';

export default async function StudentPage() {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name,
      chapters (
        id, name,
        test_batches (
          id, batch_number, question_count, difficulty_mix, created_at
        )
      )
    `)
    .order('name');

  // Get student's attempt counts per batch for "Attempted" badges
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myAttempts } = await supabase
    .from('attempts')
    .select('batch_id')
    .eq('student_id', user!.id)
    .not('submitted_at', 'is', null);

  const attemptedBatchIds = new Set((myAttempts ?? []).map((a: { batch_id: string }) => a.batch_id));

  return (
    <StudentTestBrowser
      subjects={subjects ?? []}
      attemptedBatchIds={Array.from(attemptedBatchIds)}
    />
  );
}
