import { createClient } from '@/lib/supabase/server';
import AIProcessingClient from '@/components/AIProcessingClient';
import { MindMapJSON } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AIProcessingPage() {
  const supabase = await createClient();

  const { data: materials } = await supabase
    .from('study_materials')
    .select(`
      id, title, material_type, created_at, content,
      chapter:chapters(id, name, subject:subjects(id, name))
    `)
    .eq('material_type', 'mind_map')
    .order('created_at', { ascending: false });

  const rows = (materials ?? []).map((m) => {
    const content = m.content as unknown as MindMapJSON;
    const ai = content?.ai_processing;
    const totalChunks = ai?.totalChunks ?? 0;
    const doneChunks  = ai?.chunks?.filter(c => c.status === 'done').length ?? 0;
    const failedChunks = ai?.chunks?.filter(c => c.status === 'failed').length ?? 0;
    const relationsCount = content?.relations?.length ?? 0;

    // Key usage: collect from chunk records
    const keyUsage: Record<string, number> = {};
    for (const chunk of (ai?.chunks ?? [])) {
      if (chunk.keyLabel && chunk.status === 'done') {
        keyUsage[chunk.keyLabel] = (keyUsage[chunk.keyLabel] ?? 0) + 1;
      }
    }

    return {
      id: m.id,
      title: m.title,
      subject: (m.chapter as any)?.subject?.name ?? '—',
      chapter: (m.chapter as any)?.name ?? '—',
      createdAt: m.created_at,
      recordCount: content?.records?.length ?? 0,
      status: ai?.status ?? null,
      totalChunks,
      doneChunks,
      failedChunks,
      relationsCount,
      lastUpdated: ai?.lastUpdated ?? null,
      keyUsage,
    };
  });

  return <AIProcessingClient initialRows={rows} />;
}
