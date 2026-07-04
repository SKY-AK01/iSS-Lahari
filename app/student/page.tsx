import { createClient } from '@/lib/supabase/server';
import SubjectHub from '@/components/SubjectHub';

export default async function StudentPage() {
  const supabase = await createClient();

  // Subjects → chapters → test batches + study materials in one pass
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name,
      chapters (
        id, name,
        test_batches (
          id, batch_number, question_count, difficulty_mix, created_at
        ),
        study_materials (
          id, title, material_type, created_at
        )
      )
    `)
    .order('name');

  // Attempted batch IDs for "done" badges
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myAttempts } = await supabase
    .from('attempts')
    .select('batch_id')
    .eq('student_id', user!.id)
    .not('submitted_at', 'is', null);

  const attemptedBatchIds = new Set(
    (myAttempts ?? []).map((a: { batch_id: string }) => a.batch_id)
  );

  return (
    <SubjectHub
      subjects={subjects ?? []}
      attemptedBatchIds={Array.from(attemptedBatchIds)}
    />
  );
}
