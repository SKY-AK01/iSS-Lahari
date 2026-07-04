import { createClient } from '@/lib/supabase/server';
import SubjectPage from '@/components/SubjectPage';
import { notFound } from 'next/navigation';

interface PageProps { params: Promise<{ subjectId: string }> }

export default async function SubjectRoute({ params }: PageProps) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single();
  const isMentor = profile?.role === 'mentor';

  const { data: subject } = await supabase
    .from('subjects').select('id, name').eq('id', subjectId).single();
  if (!subject) notFound();

  const { data: chaptersRaw } = await supabase
    .from('chapters')
    .select(`id, name, test_batches ( id ), study_materials ( id )`)
    .eq('subject_id', subjectId).order('name');

  const chapterIds = (chaptersRaw ?? []).map(c => c.id);
  const attemptCountByChapter: Record<string, number> = {};

  if (chapterIds.length > 0) {
    const { data: attemptsRaw } = await supabase
      .from('attempts')
      .select(`id, batch:test_batches ( chapter_id )`)
      .eq('student_id', user!.id).not('submitted_at', 'is', null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (attemptsRaw ?? []).forEach((a: any) => {
      const batch = Array.isArray(a.batch) ? a.batch[0] : a.batch;
      const cid = batch?.chapter_id;
      if (cid && chapterIds.includes(cid))
        attemptCountByChapter[cid] = (attemptCountByChapter[cid] ?? 0) + 1;
    });
  }

  const chapters = (chaptersRaw ?? []).map(c => ({
    id:             c.id,
    name:           c.name,
    batch_count:    c.test_batches?.length ?? 0,
    material_count: c.study_materials?.length ?? 0,
    attempt_count:  attemptCountByChapter[c.id] ?? 0,
  }));

  return (
    <SubjectPage
      subjectId={subjectId}
      subjectName={subject.name}
      chapters={chapters}
      isMentor={isMentor}
    />
  );
}
