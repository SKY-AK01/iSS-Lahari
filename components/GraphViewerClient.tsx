'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MindMapJSON } from '@/lib/types';

interface Props { material: MindMapJSON }

// Colour palette — level 0 = root, 1 = category, 2 = subcategory, 3 = leaf
const PALETTE = [
  { node: '#111', ring: '#FFDE00', text: '#111', bg: '#FFDE00' }, // root
  { node: '#C53030', ring: '#FED7D7', text: '#FFF', bg: '#FED7D7' }, // cat
  { node: '#2B6CB0', ring: '#BEE3F8', text: '#FFF', bg: '#BEE3F8' }, // subcat
  { node: '#276749', ring: '#C6F6D5', text: '#FFF', bg: '#C6F6D5' }, // leaf
  { node: '#6B46C1', ring: '#E9D8FD', text: '#FFF', bg: '#E9D8FD' },
  { node: '#B7791F', ring: '#FEFCBF', text: '#FFF', bg: '#FEFCBF' },
];

function col(i: number) { return PALETTE[Math.min(i, PALETTE.length - 1)]; }

// Pick up to 3 "structural" columns (category, subcategory, event/name) for graph
// and treat all others as detail-only (shown in side panel)
function pickStructuralCols(columns: string[]): number[] {
  const priority = ['category','subcategory','topic','event','name','year'];
  const indices: number[] = [];
  // First pass: preferred names
  for (const pref of priority) {
    const i = columns.findIndex(c => c.toLowerCase().includes(pref));
    if (i >= 0 && !indices.includes(i)) indices.push(i);
    if (indices.length >= 3) break;
  }
  // Fill up to 3 from the front
  for (let i = 0; i < columns.length && indices.length < 3; i++) {
    if (!indices.includes(i)) indices.push(i);
  }
  return indices.slice(0, 3);
}

function truncate(s: string, n = 28) {
  const clean = s.replace(/<[^>]+>/g, '').trim();
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export default function GraphViewerClient({ material }: Props) {
  const [selected, setSelected] = useState<any>(null);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    function update() {
      if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const structCols = useMemo(() => pickStructuralCols(material.columns), [material.columns]);

  const graphData = useMemo(() => {
    const nodes = new Map<string, any>();
    const links = new Map<string, any>();

    const rootId = '__root__';
    nodes.set(rootId, { id: rootId, name: material.title, label: truncate(material.title, 32), level: 0, val: 32 });

    material.records.forEach(record => {
      let prevId = rootId;

      structCols.forEach((colIdx, depth) => {
        const col = material.columns[colIdx];
        const raw = record[col] || '';
        const val = raw.replace(/<[^>]+>/g, '').trim();
        if (!val || val === '—' || val === '-') return;

        const nodeId = `d${depth}_${val}`;
        const nodeLevel = depth + 1;

        if (!nodes.has(nodeId)) {
          // Node size decreases with depth
          const nodeVal = depth === 0 ? 16 : depth === 1 ? 9 : 5;
          nodes.set(nodeId, {
            id: nodeId,
            name: val,
            label: truncate(val, depth === 0 ? 24 : depth === 1 ? 20 : 16),
            level: nodeLevel,
            val: nodeVal,
            column: col,
            colIdx,
            record,  // attach full record for side panel
          });
        } else {
          // Merge record reference (keep last for simplicity; side panel shows all)
        }

        const linkId = `${prevId}->${nodeId}`;
        if (!links.has(linkId)) {
          links.set(linkId, { source: prevId, target: nodeId, depth });
        }
        prevId = nodeId;
      });
    });

    return { nodes: Array.from(nodes.values()), links: Array.from(links.values()) };
  }, [material, structCols]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const x = node.x ?? 0, y = node.y ?? 0;
    const r = Math.sqrt(node.val) * 2.8;
    const p = col(node.level);
    const isHighlighted = activeCol === null || (node.level === 0) ||
      (node.column && node.column === activeCol) ||
      (node.level === 0);

    ctx.globalAlpha = isHighlighted ? 1 : 0.25;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, r + 2.5 / scale, 0, Math.PI * 2);
    ctx.fillStyle = p.ring;
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = p.node;
    ctx.fill();

    // Label — only render at sufficient zoom
    const minZoom = node.level === 0 ? 0.05 : node.level === 1 ? 0.25 : 0.55;
    if (scale >= minZoom) {
      const fs = node.level === 0
        ? Math.min(14, 11 / scale)
        : node.level === 1
        ? Math.min(11, 9 / scale)
        : Math.min(9, 8 / scale);

      ctx.font = `${node.level <= 1 ? 'bold ' : ''}${fs}px Inter, sans-serif`;
      const label = node.label;
      const maxW = (node.level === 0 ? 110 : node.level === 1 ? 85 : 65) / scale;
      const lines = wrapText(ctx, label, maxW);
      const lh = fs * 1.35;
      const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 6 / scale;
      const bh = lines.length * lh + 4 / scale;
      const bx = x - bw / 2;
      const by = y + r + 3 / scale;

      // bg pill
      ctx.fillStyle = p.bg + 'EE';
      ctx.strokeStyle = p.node;
      ctx.lineWidth = 0.8 / scale;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 2 / scale);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = node.level === 0 ? '#111' : p.node;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => ctx.fillText(line, x, by + 2 / scale + i * lh));
    }

    ctx.globalAlpha = 1;
  }, [activeCol]);

  const handleClick = useCallback((node: any) => {
    setSelected(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(Math.max(fgRef.current.zoom(), 2.5), 600);
    }
  }, []);

  // All records matching selected node
  const matchedRecords = useMemo(() => {
    if (!selected || selected.level === 0) return [];
    const col = material.columns[selected.colIdx];
    return material.records.filter(r => {
      const v = (r[col] || '').replace(/<[^>]+>/g, '').trim();
      return v === selected.name;
    });
  }, [selected, material]);

  const panelWidth = selected ? 340 : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#F4F4F0', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, padding: '0.6rem 1.25rem',
        background: '#111', color: '#FFF',
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        borderBottom: '3px solid #FFDE00',
      }}>
        <div style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '-0.02em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', flexShrink: 0, maxWidth: 280 }}>
          {material.title}
        </div>

        {/* Column filter pills */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', flex: 1 }}>
          <button
            onClick={() => setActiveCol(null)}
            style={{
              padding: '2px 10px', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase', cursor: 'pointer', border: 'none',
              background: activeCol === null ? '#FFDE00' : 'rgba(255,255,255,0.15)',
              color: activeCol === null ? '#111' : '#FFF',
              letterSpacing: '0.04em',
            }}
          >ALL</button>
          {material.columns.map((c, i) => (
            <button
              key={c}
              onClick={() => setActiveCol(activeCol === c ? null : c)}
              style={{
                padding: '2px 10px', fontSize: '0.62rem', fontWeight: 900, fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase', cursor: 'pointer', border: 'none', letterSpacing: '0.04em',
                background: activeCol === c
                  ? col(i + 1).node
                  : 'rgba(255,255,255,0.12)',
                color: '#FFF',
              }}
            >{c}</button>
          ))}
        </div>

        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          Click a node to see full text
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Graph canvas */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ForceGraph2D
            ref={fgRef}
            width={dims.w - panelWidth}
            height={dims.h - 52}
            graphData={graphData}
            nodeLabel=""
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            linkColor={(l: any) => l.depth === 0 ? 'rgba(0,0,0,0.4)' : l.depth === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}
            linkWidth={(l: any) => l.depth === 0 ? 2 : l.depth === 1 ? 1.2 : 0.8}
            onNodeClick={handleClick}
            onBackgroundClick={() => setSelected(null)}
            backgroundColor="#F4F4F0"
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTicks={300}
            linkDistance={80}
          />
        </div>

        {/* ── Side panel ── */}
        {selected && (
          <div style={{
            width: 340, flexShrink: 0, background: '#FFF',
            borderLeft: `4px solid ${col(selected.level).node}`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '0.75rem 1rem', flexShrink: 0,
              background: col(selected.level).node, color: '#FFF',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.75, fontFamily: 'Inter, sans-serif' }}>
                  {selected.level === 0 ? 'Root' : selected.column}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'Inter, sans-serif', marginTop: 2, lineHeight: 1.3 }}>
                  {selected.name}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '1.1rem', width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            {/* Records */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
              {selected.level === 0 ? (
                <p style={{ fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', color: '#555', lineHeight: 1.6 }}>
                  This is the root node. Click any branch node to explore its details.
                </p>
              ) : matchedRecords.length === 0 ? (
                <p style={{ fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', color: '#888' }}>No records found.</p>
              ) : (
                matchedRecords.map((rec, ri) => (
                  <div key={ri} style={{ marginBottom: ri < matchedRecords.length - 1 ? '1.25rem' : 0 }}>
                    {matchedRecords.length > 1 && (
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#999', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif' }}>
                        Record {ri + 1} / {matchedRecords.length}
                      </div>
                    )}
                    {material.columns.map((column, ci) => {
                      const v = (rec[column] || '').replace(/<[^>]+>/g, '').trim();
                      if (!v || v === '—' || v === '-') return null;
                      const isActive = column === selected.column;
                      const p = col(ci + 1);
                      return (
                        <div key={column} style={{ marginBottom: '0.6rem' }}>
                          <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: p.node, fontFamily: 'Inter, sans-serif', marginBottom: '0.15rem' }}>
                            {column}
                          </div>
                          <div style={{
                            fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', lineHeight: 1.55, color: '#111',
                            fontWeight: isActive ? 700 : 400,
                            background: isActive ? p.bg + '88' : 'transparent',
                            borderLeft: isActive ? `3px solid ${p.node}` : '3px solid transparent',
                            paddingLeft: '0.5rem', paddingTop: isActive ? 2 : 0, paddingBottom: isActive ? 2 : 0,
                          }}>
                            {v}
                          </div>
                        </div>
                      );
                    })}
                    {ri < matchedRecords.length - 1 && <div style={{ height: 1, background: '#EEE', margin: '0.75rem 0' }} />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
