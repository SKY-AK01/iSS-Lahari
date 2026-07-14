import { createClient } from '@/lib/supabase/server';
import MentorResultsClient from '@/components/MentorResultsClient';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function MentorResultsPage() {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use admin client to get ALL attempts (including in-progress) for all students
  const admin = createAdminClient();

  const { data: attempts } = await admin
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
    .order('started_at', { ascending: false });

  return <MentorResultsClient attempts={attempts ?? []} />;
}
