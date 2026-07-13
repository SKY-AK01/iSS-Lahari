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

  // Step 1: Fetch top-level questions with their content
  const { data: topLevel, error: topErr } = await supabase
    .from('pyq_questions')
    .select(`
      id, question_number, question_type, page_start, page_end,
      images, tables, marks, word_limit, sort_order,
      content:pyq_question_content(language, passage, question_text, statements, options)
    `)
    .eq('paper_id', paperId)
    .is('parent_id', null)
    .order('sort_order');

  if (topErr) {
    console.error('[pyq/questions] top-level error:', topErr);
    return NextResponse.json({ error: topErr.message, debug: { paperId, language } }, { status: 500 });
  }

  // DEBUG: return raw count + first row to diagnose empty results
  if ((topLevel ?? []).length === 0) {
    // Check if paper exists at all
    const { count } = await supabase
      .from('pyq_questions')
      .select('id', { count: 'exact', head: true })
      .eq('paper_id', paperId);
    return NextResponse.json({
      _debug: true,
      message: 'No top-level questions found',
      paperId,
      totalInTableForPaper: count,
    });
  }

  // Step 2: Fetch sub-questions separately (self-referential joins are unreliable in PostgREST)
  // Also batch the IN query to avoid URL length limits (e.g. 80 UUIDs for Prelims)
  const topIds = (topLevel ?? []).map((q: { id: string }) => q.id);
  const subMap: Record<string, unknown[]> = {};

  if (topIds.length > 0) {
    const BATCH = 40;
    const batches: string[][] = [];
    for (let i = 0; i < topIds.length; i += BATCH) {
      batches.push(topIds.slice(i, i + BATCH));
    }

    for (const batch of batches) {
      const { data: subData, error: subErr } = await supabase
        .from('pyq_questions')
        .select(`
          id, parent_id, question_number, question_type, page_start, page_end,
          images, tables, marks, word_limit, sort_order,
          content:pyq_question_content(language, passage, question_text, statements, options)
        `)
        .in('parent_id', batch)
        .order('sort_order');

      if (subErr) {
        console.error('[pyq/questions] sub-questions error:', subErr);
      } else {
        for (const sq of (subData ?? [])) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s = sq as any;
          if (!subMap[s.parent_id]) subMap[s.parent_id] = [];
          subMap[s.parent_id].push(s);
        }
      }
    }
  }

  const data = topLevel;

  // Filter content to requested language and apply search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let questions = (data ?? []).map((q: any) => {
    const langContent = q.content?.find((c: { language: string }) => c.language === language) ?? q.content?.[0] ?? null;
    const rawSubQs: unknown[] = subMap[q.id] ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subQs = rawSubQs.map((sq: any) => {
      const sqContent = sq.content?.find((c: { language: string }) => c.language === language) ?? sq.content?.[0] ?? null;
      return { ...sq, content: sqContent, sub_questions: [] };
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
