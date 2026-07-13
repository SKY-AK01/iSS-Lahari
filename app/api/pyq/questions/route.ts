import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/pyq/questions?paper_id=xxx&language=english&search=river
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const paperId  = searchParams.get('paper_id');
  const language = searchParams.get('language') || 'english';
  const search   = searchParams.get('search')?.trim();

  if (!paperId) return NextResponse.json({ error: 'paper_id required' }, { status: 400 });

  // Fetch top-level questions (no parent) with their content
  let query = supabase
    .from('pyq_questions')
    .select(`
      id, question_number, question_type, page_start, page_end,
      images, tables, marks, word_limit, sort_order,
      content:pyq_question_content(language, passage, question_text, statements, options),
      sub_questions:pyq_questions!parent_id(
        id, question_number, question_type, page_start, page_end,
        images, tables, marks, word_limit, sort_order,
        content:pyq_question_content(language, passage, question_text, statements, options)
      )
    `)
    .eq('paper_id', paperId)
    .is('parent_id', null)
    .order('sort_order');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter content to requested language and apply search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let questions = (data ?? []).map((q: any) => {
    const langContent = q.content?.find((c: { language: string }) => c.language === language) ?? q.content?.[0] ?? null;
    const subQs = (q.sub_questions ?? []).map((sq: { content: { language: string }[] }) => {
      const sqContent = sq.content?.find((c: { language: string }) => c.language === language) ?? sq.content?.[0] ?? null;
      return { ...sq, content: sqContent, sub_questions: undefined };
    });
    return { ...q, content: langContent, sub_questions: subQs };
  });

  // Text search across question text and passage
  if (search) {
    const lower = search.toLowerCase();
    questions = questions.filter(q => {
      const text = [
        q.content?.question_text,
        q.content?.passage,
        ...(q.content?.statements ?? []),
        ...q.sub_questions.flatMap((sq: { content: { question_text: string; passage: string; statements: string[] } | null }) => [
          sq.content?.question_text,
          sq.content?.passage,
          ...(sq.content?.statements ?? []),
        ]),
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(lower);
    });
  }

  return NextResponse.json(questions);
}
