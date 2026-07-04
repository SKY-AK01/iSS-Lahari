import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import GraphViewer from '@/components/GraphViewer';
import { MindMapJSON } from '@/lib/types';

interface PageProps { params: Promise<{ materialId: string }> }

export default async function GraphRoute({ params }: PageProps) {
  const { materialId } = await params;
  const supabase = await createClient();

  const { data: material } = await supabase
    .from('study_materials')
    .select('id, title, material_type, content')
    .eq('id', materialId)
    .single();

  if (!material || material.material_type !== 'mind_map') {
    notFound();
  }

  const content = material.content as unknown as MindMapJSON;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GraphViewer material={content} />
    </div>
  );
}
