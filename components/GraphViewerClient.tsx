'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MindMapJSON } from '@/lib/types';

interface Props { material: MindMapJSON }

// ── Design tokens matching app ────────────────────────────────
const C = {
  bg: '#FDF4F6',
  black: '#000',
  ruby: '#D81B60',
  white: '#FFF',
  gray: '#4A4A4A',
  levels: [
    { fill: '#000',     text: '#FFF', stroke: '#000',    r: 56 },  // root
    { fill: '#D81B60',  text: '#FFF', stroke: '#D81B60', r: 44 },  // cat
    { fill: '#FFF',     text: '#000', stroke: '#000',    r: 36 },  // subcat
    { fill: '#FDF4F6',  text: '#000', stroke: '#000',    r: 28 },  // leaf
  ],
};

// ── Build tree ────────────────────────────────────────────────
function clean(s: string) { return (s || '').replace(/<[^>]+>/g, '').trim(); }

function pickCols(columns: string[]): number[] {
  const priority = ['category','subcategory','topic','event','name','year','date'];
  const idx: number[] = [];
  for (const p of priority) {
    const i = columns.findIndex(c => c.toLowerCase().includes(p));
    if (i >= 0 && !idx.includes(i)) idx.push(i);
    if (idx.length >= 3) break;
  }
  for (let i = 0; i < columns.length && idx.length < 3; i++) {
    if (!idx.includes(i)) idx.push(i);
  }
  return idx.slice(0, 3);
}

interface TNode {
  id: string;
  label: string;
  level: number;
  column: string;
  colIdx: number;
  children: TNode[];
  records: Record<string, string>[];
  // layout
  x: number; y: number;
  w: number; h: number;
}

function buildTree(material: MindMapJSON, structCols: number[]): TNode {
  const root: TNode = { id: '__root__', label: material.title, level: 0, column: '', colIdx: -1, children: [], records: [], x: 0, y: 0, w: 0, h: 0 };

  const level0 = new Map<string, TNode>();
  const level1 = new Map<string, TNode>();
  const level2 = new Map<string, TNode>();

  for (const rec of material.records) {
    const v0 = structCols[0] !== undefined ? clean(rec[material.columns[structCols[0]]] || '') : '';
    const v1 = structCols[1] !== undefined ? clean(rec[material.columns[structCols[1]]] || '') : '';
    const v2 = structCols[2] !== undefined ? clean(rec[material.columns[structCols[2]]] || '') : '';

    if (!v0 || v0 === '—') continue;

    const k0 = v0;
    if (!level0.has(k0)) {
      const n: TNode = { id: `cat_${v0}`, label: v0, level: 1, column: material.columns[structCols[0]], colIdx: structCols[0], children: [], records: [], x: 0, y: 0, w: 0, h: 0 };
      level0.set(k0, n);
      root.children.push(n);
    }
    const cat = level0.get(k0)!;

    if (!v1 || v1 === '—') { cat.records.push(rec); continue; }

    const k1 = `${v0}::${v1}`;
    if (!level1.has(k1)) {
      const n: TNode = { id: `sub_${k1}`, label: v1, level: 2, column: material.columns[structCols[1] ?? structCols[0]], colIdx: structCols[1] ?? structCols[0], children: [], records: [], x: 0, y: 0, w: 0, h: 0 };
      level1.set(k1, n);
      cat.children.push(n);
    }
    const sub = level1.get(k1)!;

    if (!v2 || v2 === '—') { sub.records.push(rec); continue; }

    const k2 = `${k1}::${v2}`;
    if (!level2.has(k2)) {
      const n: TNode = { id: `leaf_${k2}`, label: v2, level: 3, column: material.columns[structCols[2] ?? structCols[1]], colIdx: structCols[2] ?? structCols[1], children: [], records: [], x: 0, y: 0, w: 0, h: 0 };
      level2.set(k2, n);
      sub.children.push(n);
    }
    level2.get(k2)!.records.push(rec);
  }

  return root;
}

// ── Radial layout ─────────────────────────────────────────────
const LEVEL_GAP = [0, 200, 340, 460];

function layoutRadial(root: TNode) {
  root.x = 0; root.y = 0;

  function layoutSubtree(node: TNode, startAngle: number, sweepAngle: number, depth: number) {
    const r = LEVEL_GAP[depth] ?? depth * 140;
    const children = node.children;
    if (!children.length) return;

    const step = sweepAngle / children.length;
    children.forEach((child, i) => {
      const angle = startAngle + step * i + step / 2;
      child.x = Math.cos(angle) * r;
      child.y = Math.sin(angle) * r;
      layoutSubtree(child, angle - step / 2, step, depth + 1);
    });
  }

  layoutRadial_inner(root, 1);
}

function layoutRadial_inner(node: TNode, depth: number) {
  const r = LEVEL_GAP[depth] ?? depth * 140;
  const children = node.children;
  if (!children.length) return;

  const total = children.length;
  const sweepAngle = total <= 1 ? Math.PI * 2 : Math.PI * 2;
  const step = sweepAngle / total;

  children.forEach((child, i) => {
    const angle = -Math.PI / 2 + step * i + step / 2;
    child.x = Math.cos(angle) * r;
    child.y = Math.sin(angle) * r;
    layoutRadial_inner(child, depth + 1);
  });
}

// ── Collect all nodes / links ─────────────────────────────────
function collectAll(root: TNode): TNode[] {
  const all: TNode[] = [root];
  root.children.forEach(c => all.push(...collectAll(c)));
  return all;
}

interface Link { source: TNode; target: TNode }
function collectLinks(node: TNode): Link[] {
  const links: Link[] = [];
  node.children.forEach(c => { links.push({ source: node, target: c }); links.push(...collectLinks(c)); });
  return links;
}

// ── Truncate label ─────────────────────────────────────────────
function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ── Detail Panel ──────────────────────────────────────────────
function DetailPanel({ node, columns, onClose }: { node: TNode; columns: string[]; onClose: () => void }) {
  return (
    <div style={{ width: 320, flexShrink: 0, background: C.white, borderLeft: '3px solid #000', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 20 }}>
      <div style={{ padding: '0.75rem 1rem', background: '#000', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: `3px solid ${C.ruby}`, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.ruby, marginBottom: 2 }}>{node.column || 'ROOT'}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.88rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.25 }}>{node.label}</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {node.records.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
            {node.children.length > 0 ? `${node.children.length} sub-items. Click a leaf node for details.` : 'No detail records.'}
          </p>
        ) : (
          node.records.map((rec, ri) => (
            <div key={ri} style={{ marginBottom: ri < node.records.length - 1 ? '1.25rem' : 0 }}>
              {node.records.length > 1 && <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', color: '#999', marginBottom: '0.4rem' }}>Record {ri + 1}/{node.records.length}</div>}
              {columns.map(col => {
                const v = clean(rec[col] || '');
                if (!v || v === '—' || v === '-') return null;
                const isActive = col === node.column;
                return (
                  <div key={col} style={{ marginBottom: '0.55rem' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: isActive ? C.ruby : '#555', marginBottom: 2 }}>{col}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', lineHeight: 1.5, color: '#111', fontWeight: isActive ? 700 : 400, borderLeft: isActive ? `3px solid ${C.ruby}` : '3px solid transparent', paddingLeft: '0.5rem', background: isActive ? '#FDF4F6' : 'transparent', paddingTop: isActive ? 1 : 0, paddingBottom: isActive ? 1 : 0 }}>{v}</div>
                  </div>
                );
              })}
              {ri < node.records.length - 1 && <div style={{ height: 1, background: '#EEE', margin: '0.6rem 0' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function GraphViewerClient({ material }: Props) {
  const [selected, setSelected] = useState<TNode | null>(null);
  const [search, setSearch] = useState('');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const structCols = useMemo(() => pickCols(material.columns), [material.columns]);
  const tree = useMemo(() => { const t = buildTree(material, structCols); layoutRadial_inner(t, 1); return t; }, [material, structCols]);

  const allNodes = useMemo(() => collectAll(tree), [tree]);
  const allLinks = useMemo(() => collectLinks(tree), [tree]);

  // Filter by search
  const q = search.toLowerCase().trim();
  const visibleIds = useMemo(() => {
    if (!q) return null;
    const ids = new Set<string>();
    function mark(node: TNode) {
      if (node.label.toLowerCase().includes(q) || node.records.some(r => Object.values(r).some(v => clean(v).toLowerCase().includes(q)))) {
        // Mark this and all ancestors
        ids.add(node.id);
      }
      node.children.forEach(mark);
    }
    mark(tree);
    // Also mark ancestors
    function markAncestors(node: TNode, ancestors: TNode[]) {
      if (ids.has(node.id)) ancestors.forEach(a => ids.add(a.id));
      node.children.forEach(c => markAncestors(c, [...ancestors, node]));
    }
    markAncestors(tree, []);
    return ids;
  }, [q, tree]);

  // Pan / zoom handlers
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(4, z * delta)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  // Touch pan/zoom
  const lastTouches = useRef<React.TouchList | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => { lastTouches.current = e.touches; }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouches.current?.length === 1) {
      const dx = e.touches[0].clientX - lastTouches.current[0].clientX;
      const dy = e.touches[0].clientY - lastTouches.current[0].clientY;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    } else if (e.touches.length === 2 && lastTouches.current?.length === 2) {
      const prevD = Math.hypot(lastTouches.current[0].clientX - lastTouches.current[1].clientX, lastTouches.current[0].clientY - lastTouches.current[1].clientY);
      const currD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const scale = currD / prevD;
      setZoom(z => Math.max(0.2, Math.min(4, z * scale)));
    }
    lastTouches.current = e.touches;
  }, []);

  // Center on mount
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    setPan({ x: width / 2, y: height / 2 });
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {/* ── Top bar ── */}
      <div style={{ flexShrink: 0, background: '#000', color: '#FFF', borderBottom: '3px solid #D81B60', padding: '0 1.25rem', height: 52, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '-0.02em', flexShrink: 0, maxWidth: 240 }}>
          {material.title}
        </div>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nodes…"
            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '0.3rem 0.7rem 0.3rem 1.8rem', outline: 'none' }}
            onFocus={e => (e.target.style.borderColor = C.ruby)}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.25)')}
          />
          <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', opacity: 0.5 }}>🔍</span>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flex: 1, flexWrap: 'wrap' }}>
          {material.columns.slice(0, 12).map(col => (
            <span key={col} style={{ padding: '1px 8px', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.55rem', textTransform: 'uppercase', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>{col}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button onClick={() => setZoom(z => Math.min(4, z * 1.25))} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', color: '#FFF', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', color: '#FFF', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <button onClick={() => { setZoom(1); const svg = svgRef.current; if (svg) { const { width, height } = svg.getBoundingClientRect(); setPan({ x: width / 2, y: height / 2 }); } }} style={{ height: 28, padding: '0 8px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', color: '#FFF', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.6rem', textTransform: 'uppercase' }}>Reset</button>
        </div>
        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Drag to pan · Scroll to zoom</div>
      </div>

      {/* ── Canvas + Panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          style={{ flex: 1, cursor: dragging.current ? 'grabbing' : 'grab', display: 'block' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => { lastTouches.current = null; }}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Links */}
            {allLinks.map((link, i) => {
              const dim = visibleIds && (!visibleIds.has(link.source.id) || !visibleIds.has(link.target.id));
              return (
                <line key={i}
                  x1={link.source.x} y1={link.source.y}
                  x2={link.target.x} y2={link.target.y}
                  stroke={link.source.level === 0 ? '#000' : link.source.level === 1 ? C.ruby : '#999'}
                  strokeWidth={link.source.level === 0 ? 2 : link.source.level === 1 ? 1.5 : 1}
                  strokeOpacity={dim ? 0.1 : link.source.level === 0 ? 0.5 : 0.35}
                />
              );
            })}

            {/* Nodes */}
            {allNodes.map(node => {
              const lv = Math.min(node.level, C.levels.length - 1);
              const style = C.levels[lv];
              const dim = visibleIds && !visibleIds.has(node.id);
              const isSel = selected?.id === node.id;
              const maxChars = node.level === 0 ? 20 : node.level === 1 ? 14 : node.level === 2 ? 12 : 10;
              const label = trunc(node.label, maxChars);
              const fontSize = node.level === 0 ? 11 : node.level === 1 ? 9 : 8;
              const r = style.r;

              // Wrap label into 2 lines
              const words = label.split(' ');
              const lines: string[] = [];
              let cur = '';
              for (const w of words) {
                if ((cur + ' ' + w).trim().length > (maxChars * 0.6) && cur) { lines.push(cur); cur = w; }
                else cur = cur ? cur + ' ' + w : w;
              }
              if (cur) lines.push(cur);
              const finalLines = lines.slice(0, 2);

              return (
                <g key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: 'pointer', opacity: dim ? 0.2 : 1 }}
                  onClick={(e) => { e.stopPropagation(); setSelected(selected?.id === node.id ? null : node); }}
                >
                  {/* Selection ring */}
                  {isSel && <circle r={r + 5} fill="none" stroke={C.ruby} strokeWidth={3} />}

                  {/* Node circle */}
                  <circle r={r} fill={style.fill} stroke={style.stroke} strokeWidth={isSel ? 3 : 2} />

                  {/* Label */}
                  {finalLines.map((line, li) => (
                    <text key={li}
                      x={0}
                      y={(li - (finalLines.length - 1) / 2) * (fontSize * 1.3)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontFamily: 'Inter, var(--font-heading), sans-serif', fontSize, fontWeight: node.level <= 1 ? 900 : 700, fill: style.text, pointerEvents: 'none', textTransform: node.level <= 1 ? 'uppercase' : 'none', letterSpacing: node.level <= 1 ? -0.5 : 0 }}
                    >{line}</text>
                  ))}

                  {/* Record count badge */}
                  {node.records.length > 0 && (
                    <g transform={`translate(${r - 6}, ${-r + 6})`}>
                      <circle r={8} fill={C.ruby} stroke="#FFF" strokeWidth={1.5} />
                      <text textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 7, fontWeight: 900, fill: '#FFF', fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}>{node.records.length}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Detail panel */}
        {selected && (
          <DetailPanel node={selected} columns={material.columns} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
