import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ModeSelector from '@/components/ModeSelector';

export default async function TestModePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from('test_batches')
    .select(`
      id, batch_number, question_count, difficulty_mix,
      chapter:chapters(name, subject:subjects(name))
    `)
    .eq('id', batchId)
    .single();

  if (!batch) notFound();

  return <ModeSelector batch={batch} />;
}
