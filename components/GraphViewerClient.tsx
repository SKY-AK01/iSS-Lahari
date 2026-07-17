'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MindMapJSON, AIRelation } from '@/lib/types';

interface Props {
  material: MindMapJSON;
}

// ── Colour palette ────────────────────────────────────────────────────────────
const PALETTE = [
  { node: '#E53E3E', bg: '#FED7D7', text: '#7B1818' },
  { node: '#2B6CB0', bg: '#BEE3F8', text: '#1A3D6E' },
  { node: '#2F855A', bg: '#C6F6D5', text: '#1A4731' },
  { node: '#6B46C1', bg: '#E9D8FD', text: '#3B1A78' },
  { node: '#C05621', bg: '#FEEBC8', text: '#7B3310' },
  { node: '#285E61', bg: '#B2F5EA', text: '#1A3D40' },
];

// ── Detect which column is the "primary label" (Year, Date, Name, Title etc.) ─
function detectLabelColumn(columns: string[]): string {
  const candidates = ['year', 'date', 'name', 'title', 'act', 'event', 'amendment'];
  for (const c of columns) {
    if (candidates.some(k => c.toLowerCase().includes(k))) return c;
  }
  return columns[0];
}

// ── Detect a "category" column for colour grouping ────────────────────────────
function detectCategoryColumn(columns: string[]): string | null {
  const candidates = ['category', 'type', 'class', 'kind', 'group', 'phase'];
  for (const c of columns) {
    if (candidates.some(k => c.toLowerCase().includes(k))) return c;
  }
  return null;
}

// ── Detect a "secondary label" column (short description) ────────────────────
function detectSubtitleColumn(columns: string[], labelCol: string): string | null {
  const candidates = ['act', 'name', 'title', 'event', 'agreement', 'amendment'];
  for (const c of columns) {
    if (c === labelCol) continue;
    if (candidates.some(k => c.toLowerCase().includes(k))) return c;
  }
  return null;
}

// ── Strip HTML tags ───────────────────────────────────────────────────────────
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/•/g, '·').trim();
}

// ── Wrap text on canvas ───────────────────────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) { line = word; break; }
    } else {
      line = test;
    }
  }
  if (line) {
    if (lines.length >= maxLines && ctx.measureText(line).width > maxWidth) {
      lines.push(line.substring(0, Math.floor(line.length * 0.7)) + '…');
    } else {
      lines.push(line);
    }
  }
  return lines.slice(0, maxLines);
}

export default function GraphViewerClient({ material }: Props) {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showAILinks, setShowAILinks] = useState(true);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  // Measure container
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const labelCol   = useMemo(() => detectLabelColumn(material.columns), [material]);
  const catCol     = useMemo(() => detectCategoryColumn(material.columns), [material]);
  const subCol     = useMemo(() => detectSubtitleColumn(material.columns, labelCol), [material, labelCol]);

  // ── Build category → colour index map ──────────────────────────────────────
  const catColorMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!catCol) return map;
    let idx = 0;
    material.records.forEach(r => {
      const cat = (r[catCol] || '').trim();
      if (cat && !map.has(cat)) { map.set(cat, idx % PALETTE.length); idx++; }
    });
    return map;
  }, [material, catCol]);

  // ── Build graph ─────────────────────────────────────────────────────────────
  // Each RECORD = one node. Nodes are linked chronologically (prev → next).
  // If a category column exists, nodes with the same category share a category hub node.
  const { graphData, nodeMap } = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeMap = new Map<string, any>();

    material.records.forEach((record, idx) => {
      const labelRaw = (record[labelCol] || `Record ${idx + 1}`).trim();
      const label    = stripHtml(labelRaw);
      const subtitle = subCol ? stripHtml(record[subCol] || '') : '';
      const cat      = catCol ? (record[catCol] || '').trim() : '';
      const colorIdx = cat ? (catColorMap.get(cat) ?? 0) : idx % PALETTE.length;

      const node = {
        id: `rec_${idx}`,
        recordIdx: idx,
        label,
        subtitle,
        category: cat,
        colorIdx,
        val: 10,
        fx: undefined as number | undefined,
        fy: undefined as number | undefined,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // ── Sequential (chronological) links ──────────────────────────────────
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'sequence',
      });
    }

    // ── Category hub nodes + spokes ───────────────────────────────────────
    if (catCol) {
      const catNodes = new Map<string, string>(); // category → hub node id
      nodes.forEach(n => {
        const cat = n.category;
        if (!cat) return;
        if (!catNodes.has(cat)) {
          const hubId = `cat_${cat}`;
          const colorIdx = catColorMap.get(cat) ?? 0;
          const hub = { id: hubId, label: cat, subtitle: '', category: cat, colorIdx, val: 18, isHub: true };
          nodes.push(hub);
          nodeMap.set(hubId, hub);
          catNodes.set(cat, hubId);
        }
        links.push({ source: catNodes.get(cat)!, target: n.id, type: 'category' });
      });
    }

    // ── AI relation links ─────────────────────────────────────────────────
    if (material.relations && material.relations.length > 0) {
      for (const rel of material.relations as AIRelation[]) {
        const srcId = `rec_${rel.from}`;
        const tgtId = `rec_${rel.to}`;
        // Only add if both nodes exist and link isn't already a sequence link
        if (nodeMap.has(srcId) && nodeMap.has(tgtId)) {
          links.push({
            source: srcId,
            target: tgtId,
            type: 'ai',
            relType: rel.type,
            reason: rel.reason,
          });
        }
      }
    }

    return { graphData: { nodes, links }, nodeMap };
  }, [material, labelCol, subCol, catCol, catColorMap]);

  // ── Filter graphData based on toggle ─────────────────────────────────────
  const filteredGraphData = useMemo(() => {
    if (showAILinks) return graphData;
    return {
      nodes: graphData.nodes,
      links: graphData.links.filter((l: any) => l.type !== 'ai'),
    };
  }, [graphData, showAILinks]);

  const aiRelationCount = material.relations?.length ?? 0;
  const neighbourIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const s = new Set<string>();
    filteredGraphData.links.forEach((l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      if (src === selectedNode.id) s.add(tgt);
      if (tgt === selectedNode.id) s.add(src);
    });
    return s;
  }, [selectedNode, filteredGraphData]);

  // ── Paint node ─────────────────────────────────────────────────────────────
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const isHub      = !!node.isHub;
    const isSelected = selectedNode?.id === node.id;
    const isNeighbour = neighbourIds.has(node.id);
    const isDimmed   = selectedNode && !isSelected && !isNeighbour;

    const palette = PALETTE[node.colorIdx ?? 0];
    const r = isHub ? 14 : Math.sqrt(node.val) * 2.8;

    const alpha = isDimmed ? 0.25 : 1;
    ctx.globalAlpha = alpha;

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5 / globalScale, 0, 2 * Math.PI);
      ctx.strokeStyle = palette.node;
      ctx.lineWidth = 2.5 / globalScale;
      ctx.stroke();
    } else if (isNeighbour) {
      ctx.beginPath();
      ctx.arc(x, y, r + 3 / globalScale, 0, 2 * Math.PI);
      ctx.strokeStyle = palette.node;
      ctx.lineWidth = 1.5 / globalScale;
      ctx.setLineDash([3 / globalScale, 3 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Main circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = isHub ? palette.node : palette.bg;
    ctx.fill();
    ctx.strokeStyle = palette.node;
    ctx.lineWidth = isHub ? 0 : 1.5 / globalScale;
    ctx.stroke();

    // Label
    const minScale = isHub ? 0.15 : 0.4;
    if (globalScale >= minScale) {
      const fontSize = isHub
        ? Math.min(12, 10 / globalScale)
        : Math.min(11, 9 / globalScale);
      ctx.font = `${isHub ? '700' : '600'} ${fontSize}px Inter, sans-serif`;
      const labelText  = node.label || '';
      const maxW       = isHub ? 100 / globalScale : 80 / globalScale;
      const lines      = wrapText(ctx, labelText, maxW, isHub ? 2 : 2);
      const lineH      = fontSize * 1.3;
      const boxW       = Math.max(...lines.map(l => ctx.measureText(l).width)) + 8 / globalScale;
      const boxH       = lines.length * lineH + 4 / globalScale;
      const boxX       = x - boxW / 2;
      const boxY       = y + r + 3 / globalScale;

      // Label background
      ctx.fillStyle   = isHub ? palette.node : palette.bg;
      ctx.strokeStyle = palette.node;
      ctx.lineWidth   = 1 / globalScale;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 3 / globalScale);
      ctx.fill();
      if (!isHub) ctx.stroke();

      ctx.fillStyle     = isHub ? '#FFF' : palette.text;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'top';
      lines.forEach((line, i) => {
        ctx.fillText(line, x, boxY + 2 / globalScale + i * lineH);
      });

      // Subtitle (small, below label — only when zoomed in)
      if (!isHub && node.subtitle && globalScale >= 1.2) {
        const subFontSize = Math.min(9, 7.5 / globalScale);
        ctx.font = `400 ${subFontSize}px Inter, sans-serif`;
        const subMaxW  = 100 / globalScale;
        const subLines = wrapText(ctx, node.subtitle, subMaxW, 2);
        const subY     = boxY + boxH + 2 / globalScale;
        ctx.fillStyle  = palette.text;
        ctx.globalAlpha = alpha * 0.7;
        subLines.forEach((line, i) => {
          ctx.fillText(line, x, subY + i * subFontSize * 1.3);
        });
        ctx.globalAlpha = alpha;
      }
    }

    ctx.globalAlpha = 1;
  }, [selectedNode, neighbourIds]);

  // ── Link paint ─────────────────────────────────────────────────────────────
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const src = link.source;
    const tgt = link.target;
    if (!src || !tgt || src.x == null || tgt.x == null) return;

    const isSeq  = link.type === 'sequence';
    const isCat  = link.type === 'category';
    const isAI   = link.type === 'ai';

    const isHighlighted = selectedNode && (
      src.id === selectedNode.id || tgt.id === selectedNode.id
    );
    const isDimmed = selectedNode && !isHighlighted;

    ctx.globalAlpha = isDimmed ? 0.06 : isHighlighted ? 0.9 : isSeq ? 0.45 : isAI ? 0.55 : 0.2;

    if (isAI) {
      ctx.strokeStyle = isHighlighted ? '#D53F8C' : '#D53F8C';
      ctx.lineWidth   = isHighlighted ? 2.5 / globalScale : 1.4 / globalScale;
      ctx.setLineDash([6 / globalScale, 3 / globalScale]);
    } else {
      ctx.strokeStyle = isHighlighted
        ? PALETTE[tgt.colorIdx ?? 0].node
        : isSeq ? '#333' : '#999';
      ctx.lineWidth = isHighlighted ? 2 / globalScale : isSeq ? 1.2 / globalScale : 0.8 / globalScale;
      if (isCat) ctx.setLineDash([4 / globalScale, 4 / globalScale]);
    }

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label AI relation type on the midpoint when zoomed in
    if (isAI && globalScale >= 1.5 && link.relType) {
      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2;
      const fontSize = Math.min(9, 7 / globalScale);
      ctx.font = `700 ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = '#D53F8C';
      ctx.globalAlpha = isDimmed ? 0.08 : 0.8;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.relType, mx, my);
    }

    ctx.globalAlpha = 1;
  }, [selectedNode]);

  // ── Click handler ───────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode((prev: any) => prev?.id === node.id ? null : node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 400);
      fgRef.current.zoom(Math.max(2, fgRef.current.zoom() ?? 1), 400);
    }
  }, []);

  // ── Background click deselects ──────────────────────────────────────────────
  const handleBackgroundClick = useCallback(() => setSelectedNode(null), []);

  // ── Selected record data ────────────────────────────────────────────────────
  const selectedRecord = selectedNode && !selectedNode.isHub
    ? material.records[selectedNode.recordIdx]
    : null;

  const panelWidth = 340;

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', position: 'relative', background: '#F4F4F0', overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '0.65rem 1.25rem',
        background: 'rgba(244,244,240,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid #000',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '0.95rem', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
          {material.title}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flex: 1 }}>
          {catCol
            ? Array.from(catColorMap.entries()).map(([cat, ci]) => (
                <span key={cat} style={{
                  fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px',
                  background: PALETTE[ci].node, color: '#FFF',
                  fontFamily: 'Inter, sans-serif', borderRadius: '2px',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{cat}</span>
              ))
            : material.columns.map((col, i) => (
                <span key={col} style={{
                  fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px',
                  background: PALETTE[i % PALETTE.length].node, color: '#FFF',
                  fontFamily: 'Inter, sans-serif', borderRadius: '2px',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{col}</span>
              ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'Inter, sans-serif' }}>
            {material.records.length} nodes
          </span>
          {aiRelationCount > 0 && (
            <button
              onClick={() => setShowAILinks(v => !v)}
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.7rem',
                textTransform: 'uppercase', padding: '3px 10px',
                border: '2px solid #D53F8C',
                background: showAILinks ? '#D53F8C' : '#fff',
                color: showAILinks ? '#fff' : '#D53F8C',
                cursor: 'pointer', letterSpacing: '0.04em',
              }}
            >
              AI {aiRelationCount}
            </button>
          )}
          {aiRelationCount === 0 && material.ai_processing?.status && material.ai_processing.status !== 'done' && (
            <span style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
              AI processing…
            </span>
          )}
          <button
            onClick={() => fgRef.current?.zoomToFit(400, 40)}
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', padding: '3px 10px', border: '2px solid #000', background: '#fff', cursor: 'pointer', letterSpacing: '0.04em' }}
          >
            Fit
          </button>
        </div>
      </div>

      {/* ── Graph ── */}
      <div style={{ paddingTop: 48 }}>
        <ForceGraph2D
          ref={fgRef}
          width={dims.w}
          height={dims.h - 48}
          graphData={filteredGraphData}
          nodeLabel={(node: any) => node.subtitle || node.label}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          backgroundColor="#F4F4F0"
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.25}
          cooldownTicks={300}
          nodeRelSize={4}
          onEngineStop={() => {
            // After layout settles, zoom to fit
            fgRef.current?.zoomToFit(400, 60);
          }}
        />
      </div>

      {/* ── Side panel ── */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: 48, right: 0,
          width: panelWidth,
          bottom: 0,
          background: '#FFF',
          borderLeft: '3px solid #000',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
        }}>
          {/* Panel header */}
          {(() => {
            const p = PALETTE[selectedNode.colorIdx ?? 0];
            return (
              <div style={{ padding: '0.75rem 1rem', borderBottom: '2px solid #000', display: 'flex', alignItems: 'center', gap: '0.5rem', background: p.node, flexShrink: 0 }}>
                <span style={{ flex: 1, color: '#FFF', fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedNode.isHub ? 'Category' : (selectedNode.category || labelCol)}
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1.1rem', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            );
          })()}

          {/* Primary label */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '2px solid #EEE', background: PALETTE[selectedNode.colorIdx ?? 0].bg, flexShrink: 0 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#111', lineHeight: 1.4 }}>
              {selectedNode.label}
            </div>
            {selectedNode.subtitle && selectedNode.subtitle !== selectedNode.label && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#444', marginTop: '0.25rem', lineHeight: 1.45 }}>
                {selectedNode.subtitle}
              </div>
            )}
          </div>

          {/* All fields */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {selectedNode.isHub ? (
              // Hub node: list all records in this category
              <div>
                <div style={{ fontSize: '0.65rem', fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '0.75rem' }}>
                  Records in this category
                </div>
                {material.records
                  .map((r, i) => ({ r, i }))
                  .filter(({ r }) => catCol && (r[catCol] || '').trim() === selectedNode.label)
                  .map(({ r, i }) => (
                    <div
                      key={i}
                      onClick={() => {
                        const n = nodeMap.get(`rec_${i}`);
                        if (n) { setSelectedNode(n); fgRef.current?.centerAt(n.x, n.y, 400); }
                      }}
                      style={{ padding: '0.5rem 0.75rem', marginBottom: '0.4rem', border: '2px solid #000', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, background: PALETTE[selectedNode.colorIdx ?? 0].bg }}
                    >
                      {stripHtml(r[labelCol] || `Record ${i + 1}`)}
                    </div>
                  ))}
              </div>
            ) : selectedRecord ? (
              // Record node: show all fields
              material.columns.map((col) => {
                const val = selectedRecord[col];
                if (!val || val.trim() === '' || val === '—') return null;
                const clean = stripHtml(val);
                const isBullet = val.includes('•') || val.includes('<br');
                const items = isBullet
                  ? val.split(/<br\s*\/?>/i).map(s => stripHtml(s)).filter(s => s.replace(/·/g, '').trim())
                  : null;

                return (
                  <div key={col} style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.6rem', fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: PALETTE[material.columns.indexOf(col) % PALETTE.length].node, marginBottom: '0.3rem' }}>
                      {col}
                    </div>
                    {items ? (
                      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {items.map((item, ii) => (
                          <li key={ii} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.83rem', color: '#111', lineHeight: 1.6, marginBottom: '0.2rem' }}>
                            {item.replace(/^·\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#111', lineHeight: 1.6 }}>
                        {clean}
                      </div>
                    )}
                  </div>
                );
              })
            ) : null}

            {/* AI Relations for this node */}
            {!selectedNode.isHub && (() => {
              const nodeRelations = (material.relations ?? []).filter(
                (r) => r.from === selectedNode.recordIdx || r.to === selectedNode.recordIdx
              );
              if (nodeRelations.length === 0) return null;
              return (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '2px solid #F9DCEF' }}>
                  <div style={{ fontSize: '0.6rem', fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#D53F8C', marginBottom: '0.5rem' }}>
                    AI Relations ({nodeRelations.length})
                  </div>
                  {nodeRelations.map((rel, i) => {
                    const otherIdx = rel.from === selectedNode.recordIdx ? rel.to : rel.from;
                    const otherNode = nodeMap.get(`rec_${otherIdx}`);
                    const otherLabel = otherNode?.label ?? `Record ${otherIdx + 1}`;
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (otherNode) {
                            setSelectedNode(otherNode);
                            fgRef.current?.centerAt(otherNode.x, otherNode.y, 400);
                          }
                        }}
                        style={{ padding: '0.4rem 0.6rem', marginBottom: '0.35rem', background: '#FFF0F8', border: '1.5px solid #D53F8C', cursor: otherNode ? 'pointer' : 'default', borderRadius: '2px' }}
                      >
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#D53F8C', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                          {rel.type}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111', fontFamily: 'Inter, sans-serif', marginBottom: '0.15rem' }}>
                          {otherLabel}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#555', fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
                          {rel.reason}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Prev / Next navigation */}
          {!selectedNode.isHub && (
            <div style={{ padding: '0.65rem 1rem', borderTop: '2px solid #EEE', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                disabled={selectedNode.recordIdx === 0}
                onClick={() => {
                  const prev = nodeMap.get(`rec_${selectedNode.recordIdx - 1}`);
                  if (prev) { setSelectedNode(prev); fgRef.current?.centerAt(prev.x, prev.y, 400); }
                }}
                style={{ flex: 1, padding: '0.4rem', border: '2px solid #000', background: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', opacity: selectedNode.recordIdx === 0 ? 0.3 : 1 }}
              >
                ← Prev
              </button>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#888', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                {selectedNode.recordIdx + 1} / {material.records.length}
              </div>
              <button
                disabled={selectedNode.recordIdx === material.records.length - 1}
                onClick={() => {
                  const next = nodeMap.get(`rec_${selectedNode.recordIdx + 1}`);
                  if (next) { setSelectedNode(next); fgRef.current?.centerAt(next.x, next.y, 400); }
                }}
                style={{ flex: 1, padding: '0.4rem', border: '2px solid #000', background: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', opacity: selectedNode.recordIdx === material.records.length - 1 ? 0.3 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
