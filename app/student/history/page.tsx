import { createClient } from '@/lib/supabase/server';
import StudentHistoryClient from '@/components/StudentHistoryClient';
import { redirect } from 'next/navigation';

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: attempts } = await supabase
    .from('attempts')
    .select(`
      id, mode, score, max_score, percentage, started_at, submitted_at,
      batch:test_batches(
        batch_number,
        chapter:chapters(name, subject:subjects(name))
      )
    `)
    .eq('student_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  return <StudentHistoryClient attempts={attempts ?? []} />;
}
