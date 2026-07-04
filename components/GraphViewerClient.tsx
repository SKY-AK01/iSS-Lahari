'use client';

import { useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MindMapJSON } from '@/lib/types';

interface Props {
  material: MindMapJSON;
}

export default function GraphViewerClient({ material }: Props) {
  const graphData = useMemo(() => {
    const nodesMap = new Map<string, any>();
    const linksMap = new Map<string, any>();

    // Root node
    const rootId = '__root__';
    nodesMap.set(rootId, {
      id: rootId,
      name: material.title,
      val: 20,
      group: 0,
      color: '#000000'
    });

    material.records.forEach((record) => {
      let prevNodeId = rootId;

      material.columns.forEach((col, colIdx) => {
        const cellValue = record[col];
        if (!cellValue || cellValue.trim() === '' || cellValue === '—') return;
        
        // Strip HTML if any, for the label
        const plainText = cellValue.replace(/<[^>]+>/g, '').trim();
        const shortName = plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText;
        
        const nodeId = `col${colIdx}_${plainText}`;
        
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            name: plainText, // full text for tooltip
            shortName,
            val: 5,
            group: colIdx + 1,
          });
        }

        const linkId = `${prevNodeId}->${nodeId}`;
        if (!linksMap.has(linkId)) {
          linksMap.set(linkId, {
            source: prevNodeId,
            target: nodeId,
          });
        }

        prevNodeId = nodeId;
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values())
    };
  }, [material]);

  // Color palette for different column levels
  const colors = ['#000000', 'var(--sage)', 'var(--ruby)', 'var(--sky)', 'var(--ink)', '#666666'];

  return (
    <div style={{ width: '100%', height: '100vh', background: '#F4F4F0' }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="name"
        nodeColor={(node: any) => colors[node.group % colors.length]}
        nodeRelSize={6}
        linkColor={() => 'rgba(0,0,0,0.15)'}
        linkWidth={1}
      />
    </div>
  );
}
