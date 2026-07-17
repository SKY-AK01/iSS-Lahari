import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MindMapJSON, AIChunkStatus, AIProcessing } from '@/lib/types';

const CHUNK_SIZE = 12;

/**
 * POST /api/mind-map/prepare
 * Body: { materialId: string }
 *
 * Phase 1 — chunk planning only. No AI calls.
 * - Divides records into chunks of CHUNK_SIZE
 * - Saves them to DB with status 'pending'
 * - Returns the chunk plan immediately so the UI can show it
 * - Safe to call multiple times on the same material (idempotent if already prepared)
 * - Does NOT start AI processing
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

  const { data: material, error } = await supabase
    .from('study_materials')
    .select('id, material_type, content')
    .eq('id', materialId)
    .single();

  if (error || !material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 });
  }
  if (material.material_type !== 'mind_map') {
    return NextResponse.json({ error: 'Not a mind map' }, { status: 400 });
  }

  const content = material.content as unknown as MindMapJSON;

  // Already done — don't touch it
  if (content.ai_processing?.status === 'done') {
    return NextResponse.json({
      ok: true,
      alreadyDone: true,
      chunks: content.ai_processing.chunks,
    });
  }

  // Already has chunks prepared (pending/partial) — just return the existing plan
  if (
    content.ai_processing?.chunks?.length > 0 &&
    content.ai_processing.status !== 'processing'
  ) {
    return NextResponse.json({
      ok: true,
      alreadyPrepared: true,
      chunks: content.ai_processing.chunks,
      totalChunks: content.ai_processing.totalChunks,
    });
  }

  const records = content.records ?? [];
  if (records.length === 0) {
    return NextResponse.json({ error: 'No records to chunk' }, { status: 400 });
  }

  // Build fresh chunk list
  const chunks: AIChunkStatus[] = [];
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    chunks.push({
      id: chunks.length,
      status: 'pending',
      fromIdx: i,
      toIdx: Math.min(i + CHUNK_SIZE, records.length),
    });
  }

  const processingState: AIProcessing = {
    status: 'pending',
    totalChunks: chunks.length,
    chunks,
    lastUpdated: new Date().toISOString(),
  };

  await supabase
    .from('study_materials')
    .update({ content: { ...content, ai_processing: processingState } })
    .eq('id', materialId);

  return NextResponse.json({
    ok: true,
    totalChunks: chunks.length,
    recordCount: records.length,
    chunks,
  });
}
