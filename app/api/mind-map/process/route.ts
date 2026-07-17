import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dispatchChunks, parseAIJson, ChunkInput } from '@/lib/ai';
import { MindMapJSON, AIRelation, AIChunkStatus, AIProcessing, MindMapRecord } from '@/lib/types';

export const maxDuration = 300; // allow up to 5 min on Vercel Pro / hobby has 60s limit

const CHUNK_SIZE = 12;

interface ChunkPayload {
  fromIdx: number;
  toIdx: number;
  records: MindMapRecord[];
  title: string;
  columns: string[];
}

function buildPromptForChunk(chunk: ChunkInput<ChunkPayload>): string {
  const { title, columns, records, fromIdx } = chunk.payload;
  const recordSummaries = records.map((r, i) => {
    const idx = fromIdx + i;
    const fields = columns.map(col => `${col}: ${r[col] || '—'}`).join(' | ');
    return `[${idx}] ${fields}`;
  });
  return `You are an expert knowledge graph builder for competitive exam preparation.

Below are records from a study material titled: "${title}"
Each record is prefixed with its global index number like [0], [1], etc.

${recordSummaries.join('\n')}

Your task: Find meaningful semantic relationships BETWEEN these records.

Relationship types to detect:
- builds_on: Record B extends or depends on Record A
- caused_by: Record B was a direct result of Record A
- contrasts: Records are opposing or contradictory
- same_person: Records share a key figure
- same_theme: Records belong to the same conceptual theme
- precedes: Record A directly led to Record B historically
- related_act: Records reference the same act, law, or policy
- related_article: Records reference the same article or clause
- parallel: Records happened simultaneously or mirror each other

Rules:
- Only include relationships where there is a clear, factual, exam-relevant connection.
- Do NOT create relationships just because records are sequential.
- A record can have multiple relationships.
- If no meaningful relationship exists between any pair, return an empty array.
- Use the exact global index numbers shown above.

Return ONLY valid JSON. No markdown, no explanation.

Schema:
{
  "relations": [
    { "from": <number>, "to": <number>, "type": "<relationship_type>", "reason": "<one sentence explanation>" }
  ]
}`;
}

/**
 * The actual processing worker.
 * Called by /api/mind-map/start (fire-and-forget) or directly (blocking).
 * Saves chunk-level progress to DB after every batch so it can be resumed.
 */
export async function runProcessing(materialId: string): Promise<void> {
  const supabase = await createClient();

  const { data: material } = await supabase
    .from('study_materials')
    .select('id, material_type, content')
    .eq('id', materialId)
    .single();

  if (!material || material.material_type !== 'mind_map') return;

  const content = material.content as unknown as MindMapJSON;

  // Hard guard — never reprocess done
  if (content.ai_processing?.status === 'done') return;

  const records = content.records ?? [];
  if (records.length === 0) return;

  // Use existing chunks if prepared; otherwise build fresh
  let chunks: AIChunkStatus[];
  let existingRelations: AIRelation[] = content.relations ?? [];

  const existing = content.ai_processing;
  if (existing && existing.chunks && existing.chunks.length > 0) {
    chunks = existing.chunks.map(c =>
      c.status === 'done'
        ? c
        : { ...c, status: 'pending' as const, keyLabel: undefined, provider: undefined }
    );
  } else {
    chunks = [];
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      chunks.push({
        id: chunks.length,
        status: 'pending',
        fromIdx: i,
        toIdx: Math.min(i + CHUNK_SIZE, records.length),
      });
    }
    existingRelations = [];
  }

  // Mark overall as processing
  const state: AIProcessing = {
    status: 'processing',
    totalChunks: chunks.length,
    chunks,
    lastUpdated: new Date().toISOString(),
  };
  await supabase
    .from('study_materials')
    .update({ content: { ...content, ai_processing: state, relations: existingRelations } })
    .eq('id', materialId);

  // Build dispatch inputs for pending chunks only
  const pendingChunks = chunks.filter(c => c.status === 'pending');
  const dispatchInputs: ChunkInput<ChunkPayload>[] = pendingChunks.map(c => ({
    id: c.id,
    payload: {
      fromIdx: c.fromIdx,
      toIdx: c.toIdx,
      records: records.slice(c.fromIdx, c.toIdx),
      title: content.title,
      columns: content.columns,
    },
  }));

  // Mark pending → processing in DB
  for (const c of pendingChunks) c.status = 'processing';
  state.lastUpdated = new Date().toISOString();
  await supabase
    .from('study_materials')
    .update({ content: { ...content, ai_processing: { ...state, chunks }, relations: existingRelations } })
    .eq('id', materialId);

  // Dispatch all chunks in parallel across all API keys
  const dispatchResults = await dispatchChunks(
    dispatchInputs,
    buildPromptForChunk,
    { maxTokens: 2048 }
  );

  // Merge results
  for (const result of dispatchResults) {
    const chunk = chunks.find(c => c.id === result.id);
    if (!chunk) continue;
    chunk.attempts = result.attempts;
    chunk.keyLabel = result.keyLabel;
    chunk.provider = result.provider;

    if (result.success && result.result) {
      try {
        const parsed = parseAIJson<{ relations: AIRelation[] }>(result.result);
        for (const rel of (parsed.relations ?? [])) {
          const isDuplicate = existingRelations.some(
            r => r.from === rel.from && r.to === rel.to && r.type === rel.type
          );
          if (!isDuplicate) existingRelations.push(rel);
        }
        chunk.status = 'done';
      } catch {
        chunk.status = 'failed';
      }
    } else {
      chunk.status = 'failed';
    }
  }

  const anyFailed = chunks.some(c => c.status === 'failed');
  state.status = anyFailed ? 'partial' : 'done';
  state.lastUpdated = new Date().toISOString();

  await supabase
    .from('study_materials')
    .update({
      content: {
        ...content,
        relations: existingRelations,
        ai_processing: { ...state, chunks },
      },
    })
    .eq('id', materialId);
}

/**
 * POST /api/mind-map/process
 * Direct blocking call — waits for completion and returns result.
 * Used internally by sweep and by the start route.
 */
export async function POST(req: NextRequest) {
  let materialId: string;
  try {
    const body = await req.json();
    materialId = body.materialId;
    if (!materialId) throw new Error('missing materialId');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Quick done-guard before running (avoids re-reading full content in runProcessing)
  const supabase = await createClient();
  const { data } = await supabase
    .from('study_materials')
    .select('content')
    .eq('id', materialId)
    .single();
  const content = data?.content as unknown as MindMapJSON | undefined;

  if (content?.ai_processing?.status === 'done') {
    return NextResponse.json({ ok: true, status: 'done', message: 'Already processed' });
  }
  if (content?.ai_processing?.status === 'processing') {
    return NextResponse.json({ ok: true, status: 'processing', message: 'Already in progress' }, { status: 409 });
  }

  await runProcessing(materialId);

  // Re-read final state
  const { data: final } = await supabase
    .from('study_materials')
    .select('content')
    .eq('id', materialId)
    .single();
  const finalContent = final?.content as unknown as MindMapJSON | undefined;

  return NextResponse.json({
    ok: true,
    status: finalContent?.ai_processing?.status ?? 'unknown',
    relationsFound: finalContent?.relations?.length ?? 0,
  });
}
