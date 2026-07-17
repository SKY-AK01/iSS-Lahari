import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/move — move content to a different subject/chapter
// Body variants:
//   Move chapter to another subject:       { type: 'chapter',        id, targetSubjectId }
//   Move test batch to another chapter:    { type: 'test_batch',     id, targetChapterId }
//   Move study material to another chapter:{ type: 'study_material', id, targetChapterId }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'mentor')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { type, id, targetSubjectId, targetChapterId } = body;

  if (!type || !id)
    return NextResponse.json({ error: 'type and id are required' }, { status: 400 });

  if (type === 'chapter') {
    if (!targetSubjectId)
      return NextResponse.json({ error: 'targetSubjectId required for chapter move' }, { status: 400 });

    const { data, error } = await supabase
      .from('chapters')
      .update({ subject_id: targetSubjectId })
      .eq('id', id)
      .select('id, name, subject_id')
      .single();

    if (error) {
      // Unique constraint on (subject_id, name)
      if (error.code === '23505')
        return NextResponse.json({ error: 'A chapter with this name already exists in the target subject.' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  if (type === 'test_batch') {
    if (!targetChapterId)
      return NextResponse.json({ error: 'targetChapterId required for test_batch move' }, { status: 400 });

    const { data, error } = await supabase
      .from('test_batches')
      .update({ chapter_id: targetChapterId })
      .eq('id', id)
      .select('id, chapter_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (type === 'study_material') {
    if (!targetChapterId)
      return NextResponse.json({ error: 'targetChapterId required for study_material move' }, { status: 400 });

    const { data, error } = await supabase
      .from('study_materials')
      .update({ chapter_id: targetChapterId })
      .eq('id', id)
      .select('id, chapter_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
}
