import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ModeSelector from '@/components/ModeSelector';

export default async function TestModePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: batch }, { data: prevAttempts }] = await Promise.all([
    supabase
      .from('test_batches')
      .select(`id, batch_number, question_count, difficulty_mix, chapter:chapters(name, subject:subjects(name))`)
      .eq('id', batchId)
      .single(),
    supabase
      .from('attempts')
      .select('id, mode, score, max_score, percentage, started_at, submitted_at')
      .eq('batch_id', batchId)
      .eq('student_id', user!.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }),
  ]);

  if (!batch) notFound();

  return <ModeSelector batch={batch} previousAttempts={prevAttempts ?? []} />;
}
