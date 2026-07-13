import { createClient } from '@/lib/supabase/server';
import PYQPaperClient from '@/components/PYQPaperClient';
import { notFound } from 'next/navigation';

interface PageProps { params: Promise<{ paperId: string }> }

export default async function PYQPaperPage({ params }: PageProps) {
  const { paperId } = await params;
  const supabase = await createClient();

  const { data: paper } = await supabase
    .from('papers')
    .select('id, paper_name, paper_title, year, exam_type, pdf_url, has_images, total_questions')
    .eq('id', paperId)
    .single();

  if (!paper) notFound();

  return <PYQPaperClient paper={paper} />;
}
