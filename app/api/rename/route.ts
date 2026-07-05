import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/rename — rename a subject or chapter
// Body: { type: 'subject' | 'chapter', id: string, name: string }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'mentor')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { type, id, name } = await req.json();
  if (!type || !id || !name?.trim())
    return NextResponse.json({ error: 'type, id, and name are required' }, { status: 400 });

  const tableMap: Record<string, string> = {
    subject: 'subjects',
    chapter: 'chapters',
  };

  const table = tableMap[type];
  if (!table)
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });

  const { data, error } = await supabase
    .from(table)
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id, name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
