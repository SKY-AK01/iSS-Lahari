import { createClient } from '@/lib/supabase/server';
import ChapterPage from '@/components/ChapterPage';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ chapterId: string }>;
}

export default async function ChapterRoute({ params }: PageProps) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Chapter + subject name
  const { data: chapter } = await supabase
    .from('chapters')
    .select(`
      id, name, subject_id,
      subject:subjects ( id, name )
    `)
    .eq('id', chapterId)
    .single();

  if (!chapter) notFound();

  // Study materials
  const { data: materialsRaw } = await supabase
    .from('study_materials')
    .select('id, title, material_type')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });

  const materials = (materialsRaw ?? []).map(m => ({
    id: m.id,
    title: m.title,
    material_type: m.material_type,
  }));

  // Test batches
  const { data: batchesRaw } = await supabase
    .from('test_batches')
    .select('id, batch_number, question_count, difficulty_mix')
    .eq('chapter_id', chapterId)
    .order('batch_number');

  // Student attempts for all batches in this chapter
  const batchIds = (batchesRaw ?? []).map(b => b.id);

  let attemptsByBatch: Record<string, { batch_id: string; percentage: number | null; mode: string; submitted_at: string }[]> = {};

  if (batchIds.length > 0) {
    const { data: attemptsRaw } = await supabase
      .from('attempts')
      .select('id, batch_id, percentage, mode, submitted_at')
      .eq('student_id', user!.id)
      .in('batch_id', batchIds)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });

    (attemptsRaw ?? []).forEach(a => {
      if (!attemptsByBatch[a.batch_id]) attemptsByBatch[a.batch_id] = [];
      attemptsByBatch[a.batch_id].push({
        batch_id: a.batch_id,
        percentage: a.percentage,
        mode: a.mode,
        submitted_at: a.submitted_at,
      });
    });
  }

  const batches = (batchesRaw ?? []).map(b => ({
    id: b.id,
    batch_number: b.batch_number,
    question_count: b.question_count,
    difficulty_mix: b.difficulty_mix as Record<string, number> | null,
    attempts: attemptsByBatch[b.id] ?? [],
  }));

  // Flatten subject — Supabase returns foreign key joins as arrays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectRaw = chapter.subject as unknown as any;
  const subjectData = Array.isArray(subjectRaw) ? subjectRaw[0] : subjectRaw;

  return (
    <ChapterPage
      chapterId={chapterId}
      chapterName={chapter.name}
      subjectId={chapter.subject_id}
      subjectName={subjectData?.name ?? ''}
      materials={materials}
      batches={batches}
    />
  );
}
