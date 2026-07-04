import { createClient } from '@/lib/supabase/server';
import StudentDashboard from '@/components/StudentDashboard';

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Profile for the greeting name
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single();

  // Subjects with chapter count, test batch count, study material count
  const { data: rawSubjects } = await supabase
    .from('subjects')
    .select(`
      id, name,
      chapters (
        id,
        test_batches ( id ),
        study_materials ( id )
      )
    `)
    .order('name');

  const subjects = (rawSubjects ?? []).map(s => ({
    id: s.id,
    name: s.name,
    chapter_count: s.chapters?.length ?? 0,
    material_count: s.chapters?.reduce(
      (n: number, c: { study_materials: { id: string }[] }) => n + (c.study_materials?.length ?? 0), 0
    ) ?? 0,
    batch_count: s.chapters?.reduce(
      (n: number, c: { test_batches: { id: string }[] }) => n + (c.test_batches?.length ?? 0), 0
    ) ?? 0,
  }));

  // Student attempt stats
  const { data: allAttempts } = await supabase
    .from('attempts')
    .select('id, percentage')
    .eq('student_id', user!.id)
    .not('submitted_at', 'is', null);

  const total_attempts = allAttempts?.length ?? 0;
  const percentages = (allAttempts ?? [])
    .map(a => a.percentage)
    .filter((p): p is number => p != null);
  const avg_score = percentages.length > 0
    ? percentages.reduce((a, b) => a + b, 0) / percentages.length
    : null;
  const best_score = percentages.length > 0
    ? Math.max(...percentages)
    : null;

  // Recent 3 attempts
  const { data: recentRaw } = await supabase
    .from('attempts')
    .select(`
      id, mode, percentage, submitted_at,
      batch:test_batches (
        batch_number,
        chapter:chapters (
          name,
          subject:subjects ( name )
        )
      )
    `)
    .eq('student_id', user!.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(3);

  const recentAttempts = (recentRaw ?? []).map((a: {
    id: string;
    mode: string;
    percentage: number | null;
    submitted_at: string;
    batch: {
      batch_number: number;
      chapter: {
        name: string;
        subject: { name: string };
      };
    } | null;
  }) => ({
    id: a.id,
    subject_name: a.batch?.chapter?.subject?.name ?? '—',
    chapter_name: a.batch?.chapter?.name ?? '—',
    batch_number: a.batch?.batch_number ?? 0,
    mode: a.mode,
    percentage: a.percentage,
    submitted_at: a.submitted_at,
  }));

  return (
    <StudentDashboard
      name={profile?.name ?? 'Student'}
      subjects={subjects}
      stats={{ total_attempts, avg_score, best_score }}
      recentAttempts={recentAttempts}
    />
  );
}
