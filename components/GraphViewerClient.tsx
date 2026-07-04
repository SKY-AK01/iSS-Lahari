'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MindMapJSON } from '@/lib/types';

interface Props {
  material: MindMapJSON;
}

// Level palette: root=black, col1=orange-red, col2=teal-blue, col3=olive, col4=purple, deeper=grey
const LEVEL_COLORS = ['#111111', '#E53E3E', '#2B6CB0', '#2F855A', '#6B46C1', '#718096'];
const LEVEL_BG     = ['#FFDE00', '#FED7D7', '#BEE3F8', '#C6F6D5', '#E9D8FD', '#E2E8F0'];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3); // max 3 lines
}

export default function GraphViewerClient({ material }: Props) {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const fgRef = useRef<any>(null);

  const graphData = useMemo(() => {
    const nodesMap = new Map<string, any>();
    const linksMap = new Map<string, any>();

    const rootId = '__root__';
    nodesMap.set(rootId, {
      id: rootId,
      name: material.title,
      label: material.title,
      val: 28,
      group: 0,
    });

    material.records.forEach((record) => {
      let prevNodeId = rootId;

      material.columns.forEach((col, colIdx) => {
        const cellValue = record[col];
        if (!cellValue || cellValue.trim() === '' || cellValue === '—') return;

        const plainText = cellValue.replace(/<[^>]+>/g, '').trim();
        const nodeId = `col${colIdx}_${plainText}`;
        const nodeVal = colIdx === 0 ? 14 : colIdx === 1 ? 8 : 5;

        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            name: plainText,
            label: plainText.length > 30 ? plainText.substring(0, 28) + '…' : plainText,
            val: nodeVal,
            group: colIdx + 1,
            column: col,
          });
        }

        const linkId = `${prevNodeId}->${nodeId}`;
        if (!linksMap.has(linkId)) {
          linksMap.set(linkId, { source: prevNodeId, target: nodeId, level: colIdx });
        }

        prevNodeId = nodeId;
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values()),
    };
  }, [material]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isRoot = node.group === 0;
    const r = Math.sqrt(node.val) * 3;
    const x = node.x ?? 0;
    const y = node.y ?? 0;

    const color = LEVEL_COLORS[node.group % LEVEL_COLORS.length];
    const bg    = LEVEL_BG[node.group % LEVEL_BG.length];

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    if (isRoot) {
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Always draw label (adapts to zoom)
    const minScale = isRoot ? 0.1 : 0.3;
    if (globalScale >= minScale) {
      const fontSize = isRoot
        ? Math.min(16, 14 / globalScale)
        : Math.min(13, 11 / globalScale);

      ctx.font = `${isRoot ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
      const label = node.label || node.name;
      const maxTextWidth = isRoot ? 120 / globalScale : 90 / globalScale;

      // Background pill behind text
      const lines = wrapText(ctx, label, maxTextWidth);
      const lineH = fontSize * 1.3;
      const boxH = lines.length * lineH;
      const boxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 8 / globalScale;
      const boxY = y + r + 4 / globalScale;

      ctx.fillStyle = bg;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2 / globalScale;
      ctx.beginPath();
      const bx = x - boxW / 2;
      const br = 3 / globalScale;
      ctx.roundRect(bx, boxY, boxW, boxH + 4 / globalScale, br);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => {
        ctx.fillText(line, x, boxY + 2 / globalScale + i * lineH);
      });
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    // Zoom to node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 500);
      fgRef.current.zoom(3, 500);
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#F4F4F0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '0.75rem 1.5rem',
        background: 'rgba(244,244,240,0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid #000',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
          {material.title}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {material.columns.map((col, i) => (
            <span key={col} style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
              background: LEVEL_COLORS[(i + 1) % LEVEL_COLORS.length],
              color: '#FFF', fontFamily: 'Inter, sans-serif',
              borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{col}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Click a node to see full text
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel=""
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        linkColor={(link: any) => `rgba(0,0,0,${link.level === 0 ? 0.35 : 0.15})`}
        linkWidth={(link: any) => link.level === 0 ? 1.5 : 1}
        onNodeClick={handleNodeClick}
        backgroundColor="#F4F4F0"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        cooldownTicks={200}
      />

      {/* Side panel on click */}
      {selectedNode && (() => {
        // Find all records that contain this node's value in its column
        const colIdx = selectedNode.group - 1;
        const matchingRecords = selectedNode.group === 0
          ? [Object.fromEntries(material.columns.map(c => [c, '']))] // root: show empty
          : material.records.filter(r => {
              const col = material.columns[colIdx];
              if (!col) return false;
              const v = (r[col] || '').replace(/<[^>]+>/g, '').trim();
              return v === selectedNode.name;
            });

        return (
          <div style={{
            position: 'absolute', top: 54, right: 0, width: '320px', bottom: 0,
            background: '#FFF', borderLeft: '3px solid #000',
            display: 'flex', flexDirection: 'column', zIndex: 20,
          }}>
            {/* Panel header */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '2px solid #000', display: 'flex', alignItems: 'center', gap: '0.5rem', background: LEVEL_COLORS[selectedNode.group % LEVEL_COLORS.length], flexShrink: 0 }}>
              <span style={{ flex: 1, color: '#FFF', fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedNode.group === 0 ? 'Root' : (selectedNode.column || `Level ${selectedNode.group}`)}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >×</button>
            </div>

            {/* Selected node name */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '2px solid #EEE', background: LEVEL_BG[selectedNode.group % LEVEL_BG.length], flexShrink: 0 }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#111', lineHeight: 1.5, textTransform: 'none', margin: 0 }}>
                {selectedNode.name}
              </p>
            </div>

            {/* Full rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {matchingRecords.length === 0 ? (
                <p style={{ color: '#888', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>No matching records found.</p>
              ) : (
                matchingRecords.map((rec, recIdx) => (
                  <div key={recIdx} style={{ marginBottom: recIdx < matchingRecords.length - 1 ? '1.5rem' : 0 }}>
                    {matchingRecords.length > 1 && (
                      <div style={{ fontSize: '0.65rem', fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '0.5rem' }}>
                        Record {recIdx + 1}
                      </div>
                    )}
                    {material.columns.map((col, ci) => {
                      const val = (rec[col] || '').replace(/<[^>]+>/g, '').trim();
                      if (!val || val === '—') return null;
                      const isActive = ci === colIdx;
                      return (
                        <div key={col} style={{ marginBottom: '0.75rem', paddingLeft: ci * 10, position: 'relative' }}>
                          {ci > 0 && (
                            <div style={{ position: 'absolute', left: ci * 10 - 8, top: 0, bottom: 0, width: 2, background: LEVEL_COLORS[ci % LEVEL_COLORS.length], opacity: 0.3 }} />
                          )}
                          <div style={{
                            fontSize: '0.6rem', fontFamily: 'Inter, sans-serif', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                            color: LEVEL_COLORS[ci % LEVEL_COLORS.length],
                            marginBottom: '0.2rem',
                          }}>{col}</div>
                          <div style={{
                            fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', fontWeight: isActive ? 700 : 400,
                            color: '#111', lineHeight: 1.55,
                            background: isActive ? LEVEL_BG[ci % LEVEL_BG.length] : 'transparent',
                            padding: isActive ? '4px 6px' : '0',
                            borderLeft: isActive ? `3px solid ${LEVEL_COLORS[ci % LEVEL_COLORS.length]}` : 'none',
                            borderRadius: '0px',
                          }}>
                            {val}
                          </div>
                        </div>
                      );
                    })}
                    {recIdx < matchingRecords.length - 1 && (
                      <div style={{ height: 2, background: '#EEE', margin: '1rem 0' }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
