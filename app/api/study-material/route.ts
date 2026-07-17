import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MindMapJSON } from '@/lib/types';

// ── GET /api/study-material?chapterId=xxx ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const chapterId = searchParams.get('chapterId');

  let query = supabase
    .from('study_materials')
    .select('id, title, material_type, created_at, content, chapter:chapters(id, name, subject:subjects(id, name))')
    .order('created_at', { ascending: false });

  if (chapterId) {
    query = query.eq('chapter_id', chapterId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── POST /api/study-material ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth & role check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'mentor') {
    return NextResponse.json({ error: 'Forbidden — mentor only' }, { status: 403 });
  }

  const body: { chapter: string; subject: string; material: MindMapJSON } = await req.json();

  try {
    // 1. Upsert subject
    const { data: subject, error: sErr } = await supabase
      .from('subjects')
      .upsert({ name: body.subject }, { onConflict: 'name' })
      .select('id')
      .single();
    if (sErr) throw sErr;

    // 2. Upsert chapter
    const { data: chapter, error: cErr } = await supabase
      .from('chapters')
      .upsert({ subject_id: subject.id, name: body.chapter }, { onConflict: 'subject_id,name' })
      .select('id')
      .single();
    if (cErr) throw cErr;

    // 3. Insert (or replace) study material for this chapter + title
    const { data: existing } = await supabase
      .from('study_materials')
      .select('id')
      .eq('chapter_id', chapter.id)
      .eq('title', body.material.title)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('study_materials')
        .update({ content: body.material, material_type: 'mind_map' })
        .eq('id', existing.id)
        .select('id')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('study_materials')
        .insert({
          chapter_id: chapter.id,
          material_type: 'mind_map',
          title: body.material.title,
          content: body.material,
        })
        .select('id')
        .single();
      if (error) throw error;
      result = data;
    }

    // Fire-and-forget: kick off AI relation processing for new mind maps
    if (body.material) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      fetch(`${base}/api/mind-map/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: result.id }),
      }).catch(e => console.error('[study-material] Auto-process failed:', e));
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error('Save study material error:', e);
    return NextResponse.json({ error: (e as Error).message ?? 'Unknown error' }, { status: 500 });
  }
}
