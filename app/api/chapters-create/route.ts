import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { subjectId, name } = await req.json();
  if (!subjectId || !name?.trim()) return NextResponse.json({ error: 'subjectId and name required' }, { status: 400 });

  const { data, error } = await supabase
    .from('chapters')
    .upsert({ subject_id: subjectId, name: name.trim() }, { onConflict: 'subject_id,name' })
    .select('id, name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
