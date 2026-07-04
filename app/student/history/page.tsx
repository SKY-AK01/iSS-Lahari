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
      id: String(a.id),
      mode: String(a.mode),
      score: a.score ?? null,
      max_score: a.max_score ?? null,
      percentage: a.percentage ?? null,
      started_at: String(a.started_at ?? ''),
      submitted_at: a.submitted_at ? String(a.submitted_at) : null,
      batch: batch
        ? {
            id: String(batch.id ?? ''),
            batch_number: Number(batch.batch_number ?? 0),
            chapter: {
              name: String(chapter?.name ?? ''),
              subject: { name: String(subject?.name ?? '') },
            },
          }
        : null,
    };
  });

  return <StudentHistoryClient attempts={attempts as Parameters<typeof StudentHistoryClient>[0]['attempts']} />;
}
