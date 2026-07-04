import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/subjects — returns all subjects with their chapters
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, chapters(id, name)')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
