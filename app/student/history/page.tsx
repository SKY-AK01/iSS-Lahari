import { createClient } from '@/lib/supabase/server';
import StudentHistoryClient from '@/components/StudentHistoryClient';
import { redirect } from 'next/navigation';

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: raw } = await supabase
    .from('attempts')
    .select(`
      id, mode, score, max_score, percentage, started_at, submitted_at,
      batch:test_batches(
        id, batch_number,
        chapter:chapters(name, subject:subjects(name))
      )
    `)
    .eq('student_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  // Supabase returns joined relations as arrays — flatten to objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attempts = (raw ?? []).map((a: any) => {
    const batch = Array.isArray(a.batch) ? a.batch[0] : a.batch;
    const chapter = Array.isArray(batch?.chapter) ? batch.chapter[0] : batch?.chapter;
    const subject = Array.isArray(chapter?.subject) ? chapter.subject[0] : chapter?.subject;
    return {
      id: a.id,
      mode: a.mode,
      score: a.score,
      max_score: a.max_score,
      percentage: a.percentage,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      batch: batch ? {
        id: batch.id,
        batch_number: batch.batch_number,
        chapter: chapter ? {
          name: chapter.name,
          subject: subject ? { name: subject.name } : { name: '' },
        } : { name: '', subject: { name: '' } },
      } : null,
    };
  });

  return <StudentHistoryClient attempts={attempts} />;
}
