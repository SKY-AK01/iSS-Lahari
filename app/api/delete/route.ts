import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/delete?type=subject|chapter|study_material|test_batch&id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'mentor')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id   = searchParams.get('id');

  if (!type || !id)
    return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });

  const tableMap: Record<string, string> = {
    subject:        'subjects',
    chapter:        'chapters',
    study_material: 'study_materials',
    test_batch:     'test_batches',
  };

  const table = tableMap[type];
  if (!table)
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
