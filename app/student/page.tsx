import { createClient } from '@/lib/supabase/server';
import StudentDashboard from '@/components/StudentDashboard';

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Run all independent queries in parallel — was 4 sequential round-trips, now 1 batch
  const [
    { data: profile },
    { data: rawSubjects },
    { data: allAttempts },
    { data: recentRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('name, role').eq('id', user!.id).single(),
    supabase.from('subjects')
      .select(`id, name, chapters ( id, test_batches ( id ), study_materials ( id ) )`)
      .order('name'),
    supabase.from('attempts').select('id, percentage')
      .eq('student_id', user!.id).not('submitted_at', 'is', null),
    supabase.from('attempts')
      .select(`id, mode, percentage, submitted_at,
        batch:test_batches ( batch_number, chapter:chapters ( name, subject:subjects ( name ) ) )`)
      .eq('student_id', user!.id).not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }).limit(3),
  ]);

  const isMentor = profile?.role === 'mentor';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects = (rawSubjects ?? []).map((s: any) => ({
    id: String(s.id),
    name: String(s.name),
    chapter_count:  s.chapters?.length ?? 0,
    material_count: (s.chapters ?? []).reduce((n: number, c: { study_materials?: unknown[] }) => n + (c.study_materials?.length ?? 0), 0),
    batch_count:    (s.chapters ?? []).reduce((n: number, c: { test_batches?: unknown[] }) => n + (c.test_batches?.length ?? 0), 0),
  }));

  const total_attempts = allAttempts?.length ?? 0;
  const percentages = (allAttempts ?? []).map(a => a.percentage).filter((p): p is number => p != null);
  const avg_score  = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : null;
  const best_score = percentages.length > 0 ? Math.max(...percentages) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentAttempts = (recentRaw ?? []).map((a: any) => {
    const batch   = Array.isArray(a.batch)          ? a.batch[0]          : a.batch;
    const chapter = Array.isArray(batch?.chapter)   ? batch.chapter[0]   : batch?.chapter;
    const subject = Array.isArray(chapter?.subject) ? chapter.subject[0] : chapter?.subject;
    return {
      id:           String(a.id),
      subject_name: String(subject?.name  ?? '—'),
      chapter_name: String(chapter?.name  ?? '—'),
      batch_number: Number(batch?.batch_number ?? 0),
      mode:         String(a.mode),
      percentage:   a.percentage ?? null,
      submitted_at: String(a.submitted_at),
    };
  });

  return (
    <StudentDashboard
      name={profile?.name ?? 'Student'}
      subjects={subjects}
      stats={{ total_attempts, avg_score, best_score }}
      recentAttempts={recentAttempts}
      isMentor={isMentor}
    />
  );
}
