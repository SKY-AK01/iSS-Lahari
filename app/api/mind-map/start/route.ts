import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MindMapJSON } from '@/lib/types';
import { runProcessing } from '@/app/api/mind-map/process/route';

/**
 * POST /api/mind-map/start
 * Body: { materialId: string }
 *
 * Phase 2 — triggers AI processing and returns 202 IMMEDIATELY.
 * The server continues processing in the background even after the browser closes.
 *
 * How it works:
 * - Returns the HTTP response right away (202 Accepted)
 * - Detaches runProcessing() so it runs without blocking the response
 * - The Node.js event loop keeps the async work alive server-side
 * - Progress is written to DB after each chunk, visible on next poll
 *
 * Guards:
 * - Already 'done'     → 200, skips
 * - Already 'processing' → 409, skips (already running)
 * - Chunks not prepared → 400, prepare first
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  let materialId: string;
  try {
    const body = await req.json();
    materialId = body.materialId;
    if (!materialId) throw new Error('missing materialId');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: material } = await supabase
    .from('study_materials')
    .select('content')
    .eq('id', materialId)
    .single();

  const content = material?.content as unknown as MindMapJSON | undefined;
  const aiStatus = content?.ai_processing?.status;

  // Already done — never reprocess
  if (aiStatus === 'done') {
    return NextResponse.json({ ok: true, status: 'done', message: 'Already processed — skipping' });
  }

  // Already running — don't spawn a second worker
  if (aiStatus === 'processing') {
    return NextResponse.json(
      { ok: true, status: 'processing', message: 'Already in progress' },
      { status: 409 }
    );
  }

  // Must have chunks prepared first (status should be 'pending' or 'partial')
  if (!content?.ai_processing?.chunks?.length) {
    return NextResponse.json(
      { error: 'Chunks not prepared. Call /api/mind-map/prepare first.' },
      { status: 400 }
    );
  }

  // ── Fire and forget ───────────────────────────────────────────────────────
  // We deliberately do NOT await runProcessing.
  // The response is sent immediately; the server keeps the promise alive.
  // On Vercel: works within the function timeout (maxDuration on process route).
  // On self-hosted Node: runs as long as needed.
  runProcessing(materialId).catch(e =>
    console.error(`[start] Background processing failed for ${materialId}:`, e)
  );

  return NextResponse.json(
    {
      ok: true,
      status: 'processing',
      message: 'Processing started in background — safe to close this page',
      totalChunks: content.ai_processing.totalChunks,
    },
    { status: 202 }
  );
}
