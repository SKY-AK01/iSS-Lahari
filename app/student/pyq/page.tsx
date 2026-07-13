import { createClient } from '@/lib/supabase/server';
import PYQBrowserClient from '@/components/PYQBrowserClient';

export const metadata = {
  title: 'PYQ Browser — Lahari',
  description: 'Browse UPSC Previous Year Question Papers from 2018 to 2025.',
};

export default async function PYQPage() {
  const supabase = await createClient();

  // Fetch distinct years and exam types for filter UI
  const { data: papers } = await supabase
    .from('papers')
    .select('id, paper_name, year, exam_type, pdf_url, has_images, total_questions')
    .order('year', { ascending: false })
    .order('exam_type');

  // Build filter options
  const allYears = [...new Set((papers ?? []).map(p => p.year))].sort((a, b) => b - a);
  const allTypes = [...new Set((papers ?? []).map(p => p.exam_type))].sort();

  return (
    <PYQBrowserClient
      papers={papers ?? []}
      years={allYears}
      examTypes={allTypes}
    />
  );
}
