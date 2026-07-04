import { createClient } from '@/lib/supabase/server';
import MentorResultsClient from '@/components/MentorResultsClient';

export default async function MentorResultsPage() {
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from('attempts')
    .select(`
      id, mode, score, max_score, percentage, started_at, submitted_at,
      marking_correct, marking_wrong, marking_partial,
      student:profiles(id, name),
      batch:test_batches(
        id, batch_number,
        chapter:chapters(id, name, subject:subjects(id, name))
      )
    `)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  return <MentorResultsClient attempts={attempts ?? []} />;
}
