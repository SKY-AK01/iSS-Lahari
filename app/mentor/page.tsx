import { createClient } from '@/lib/supabase/server';
import MentorDashboardClient from '@/components/MentorDashboardClient';

export default async function MentorPage() {
  const supabase = await createClient();

  // Fetch subjects with chapters and batch counts
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name,
      chapters (
        id, name,
        test_batches (
          id, batch_number, question_count, difficulty_mix, created_at
        )
      )
    `)
    .order('name');

  // Fetch recent attempt summary
  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select(`
      id, mode, score, max_score, percentage, submitted_at,
      student:profiles(name),
      batch:test_batches(batch_number, chapter:chapters(name, subject:subjects(name)))
    `)
    .order('submitted_at', { ascending: false })
    .limit(5);

  // Fetch study materials summary
  const { data: studyMaterials } = await supabase
    .from('study_materials')
    .select(`
      id, title, material_type, created_at,
      chapter:chapters(id, name, subject:subjects(id, name))
    `)
    .order('created_at', { ascending: false });

  return (
    <MentorDashboardClient
      subjects={subjects ?? []}
      recentAttempts={recentAttempts ?? []}
      studyMaterials={studyMaterials ?? []}
    />
  );
}
