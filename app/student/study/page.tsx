import { createClient } from '@/lib/supabase/server';
import StudyBrowserClient from '@/components/StudyBrowserClient';

export default async function StudentStudyPage() {
  const supabase = await createClient();

  // Fetch all study materials with their chapter/subject hierarchy
  const { data: materials } = await supabase
    .from('study_materials')
    .select(`
      id, title, material_type, created_at,
      chapter:chapters(
        id, name,
        subject:subjects(id, name)
      )
    `)
    .order('created_at', { ascending: false });

  return <StudyBrowserClient materials={materials ?? []} />;
}
