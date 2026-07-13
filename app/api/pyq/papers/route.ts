import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/pyq/papers?year=2024&exam_type=UPSC+Prelims+GS+Paper+1
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const year      = searchParams.get('year');
  const examType  = searchParams.get('exam_type');

  let query = supabase
    .from('papers')
    .select('id, paper_name, paper_title, year, exam_type, pdf_url, has_images, total_questions')
    .order('year', { ascending: false })
    .order('exam_type');

  if (year)     query = query.eq('year', parseInt(year));
  if (examType) query = query.eq('exam_type', examType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
