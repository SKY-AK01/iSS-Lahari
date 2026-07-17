import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MindMapJSON } from '@/lib/types';

/**
 * GET /api/mind-map/sweep
 *
 * Finds every mind_map study material that is NOT yet 'done' and
 * fires off /api/mind-map/process for each one (fire-and-forget).
 *
 * Called automatically:
 *   1. When the mentor dashboard mounts
 *   2. On a 30-second polling interval while the dashboard is open
 *   3. After each new mind-map upload
 *
 * Returns immediately — processing happens in the background.
 */
export async function GET() {
  const supabase = await createClient();

  // Fetch all mind maps — only id + content (we only need ai_processing.status)
  const { data: materials, error } = await supabase
    .from('study_materials')
    .select('id, content')
    .eq('material_type', 'mind_map');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const queued: string[]  = [];
  const skipped: string[] = [];

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  for (const m of materials ?? []) {
    const content = m.content as unknown as MindMapJSON;
    const status  = content?.ai_processing?.status;

    // Skip materials that are already fully processed or currently being processed
    if (status === 'done' || status === 'processing') {
      skipped.push(m.id);
      continue;
    }

    // Only auto-trigger if chunks are already prepared (status pending/partial)
    // Materials with no ai_processing (null) are NOT auto-triggered — they need
    // the mentor to click Prepare first, then Start.
    if (!content?.ai_processing?.chunks?.length) {
      skipped.push(m.id);
      continue;
    }

    // Fire-and-forget via the start route (returns 202, keeps running server-side)
    fetch(`${base}/api/mind-map/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId: m.id }),
    }).catch(e => console.error(`[sweep] Failed to start process for ${m.id}:`, e));

    queued.push(m.id);
  }

  return NextResponse.json({
    ok: true,
    queued: queued.length,
    skipped: skipped.length,
    queuedIds: queued,
  });
}
