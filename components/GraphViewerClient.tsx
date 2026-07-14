'use client';

import { useState, useMemo } from 'react';
import { MindMapJSON } from '@/lib/types';

interface Props { material: MindMapJSON }

// Pick structural columns (category, subcategory, event/name) for the tree
function pickStructuralCols(columns: string[]): number[] {
  const priority = ['category', 'subcategory', 'topic', 'event', 'name', 'year', 'date'];
  const indices: number[] = [];
  for (const pref of priority) {
    const i = columns.findIndex(c => c.toLowerCase().includes(pref));
    if (i >= 0 && !indices.includes(i)) indices.push(i);
    if (indices.length >= 3) break;
  }
  for (let i = 0; i < columns.length && indices.length < 3; i++) {
    if (!indices.includes(i)) indices.push(i);
  }
  return indices.slice(0, 3);
}

function clean(s: string) {
  return (s || '').replace(/<[^>]+>/g, '').trim();
}

// Level styles matching app design system
const LEVEL_STYLES = [
  // Level 0: categories — bold black header
  {
    node: { background: '#000', color: '#FFF', border: '3px solid #000', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '-0.02em', fontSize: '0.85rem', padding: '0.6rem 1rem', boxShadow: '4px 4px 0 0 #000' },
    dot: { background: '#D81B60', width: 12, height: 12 },
    line: '#000',
  },
  // Level 1: subcategories — ruby accent
  {
    node: { background: '#FFF', color: '#000', border: '3px solid #000', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '-0.01em', fontSize: '0.78rem', padding: '0.45rem 0.85rem', boxShadow: '3px 3px 0 0 #000' },
    dot: { background: '#000', width: 10, height: 10 },
    line: '#000',
  },
  // Level 2: leaves — light cards
  {
    node: { background: 'var(--bg)', color: '#000', border: '2px solid #000', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0', fontSize: '0.78rem', padding: '0.4rem 0.75rem', boxShadow: '2px 2px 0 0 #000' },
    dot: { background: '#D81B60', width: 8, height: 8 },
    line: '#999',
  },
];

interface TreeNode {
  id: string;
  label: string;
  level: number;
  colIdx: number;
  column: string;
  children: TreeNode[];
  records: Record<string, string>[];
}

function buildTree(material: MindMapJSON, structCols: number[]): TreeNode[] {
  const roots = new Map<string, TreeNode>();

  for (const record of material.records) {
    let parentMap = roots;
    let currentLevel = 0;

    for (const colIdx of structCols) {
      const column = material.columns[colIdx];
      const val = clean(record[column] || '');
      if (!val || val === '—' || val === '-') break;

      const key = `${currentLevel}_${val}`;
      if (!parentMap.has(key)) {
        parentMap.set(key, {
          id: key,
          label: val,
          level: currentLevel,
          colIdx,
          column,
          children: [],
          records: [],
        });
      }
      const node = parentMap.get(key)!;
      if (currentLevel === structCols.length - 1) {
        node.records.push(record);
      }

      // Move to next level using children map
      const childMap = new Map(node.children.map(c => [c.id, c]));
      parentMap = childMap;
      // We need a reference that updates the actual children array
      // Use a different approach: rebuild children as a map per node
      currentLevel++;
    }
  }

  // Rebuild properly
  return buildTreeNodes(material, structCols);
}

function buildTreeNodes(material: MindMapJSON, structCols: number[]): TreeNode[] {
  // Use a nested map approach
  type NodeStore = Map<string, { node: TreeNode; children: Map<string, { node: TreeNode; children: Map<string, { node: TreeNode }> }> }>;
  const level0: NodeStore = new Map();

  for (const record of material.records) {
    const vals = structCols.map(ci => clean(record[material.columns[ci]] || ''));

    const v0 = vals[0];
    const v1 = vals[1];
    const v2 = vals[2];
    if (!v0 || v0 === '—') continue;

    if (!level0.has(v0)) {
      level0.set(v0, {
        node: { id: `0_${v0}`, label: v0, level: 0, colIdx: structCols[0], column: material.columns[structCols[0]], children: [], records: [] },
        children: new Map(),
      });
    }
    const l0 = level0.get(v0)!;

    if (!v1 || v1 === '—') { l0.node.records.push(record); continue; }

    if (!l0.children.has(v1)) {
      l0.children.set(v1, {
        node: { id: `1_${v0}_${v1}`, label: v1, level: 1, colIdx: structCols[1] ?? structCols[0], column: material.columns[structCols[1] ?? structCols[0]], children: [], records: [] },
        children: new Map(),
      });
    }
    const l1 = l0.children.get(v1)!;

    if (!v2 || v2 === '—') { l1.node.records.push(record); continue; }

    if (!l1.children.has(v2)) {
      l1.children.set(v2, {
        node: { id: `2_${v0}_${v1}_${v2}`, label: v2, level: 2, colIdx: structCols[2] ?? structCols[1], column: material.columns[structCols[2] ?? structCols[1]], children: [], records: [] },
      });
    }
    l1.children.get(v2)!.node.records.push(record);
  }

  // Flatten into tree
  const result: TreeNode[] = [];
  for (const [, l0] of level0) {
    l0.node.children = [];
    for (const [, l1] of l0.children) {
      l1.node.children = Array.from(l1.children.values()).map(l2 => l2.node);
      l0.node.children.push(l1.node);
    }
    result.push(l0.node);
  }
  return result;
}

// Detail panel
function DetailPanel({ node, columns, onClose }: { node: TreeNode; columns: string[]; onClose: () => void }) {
  const records = node.records;
  return (
    <div style={{ width: 340, flexShrink: 0, background: '#FFF', borderLeft: '4px solid #000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', background: '#000', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, borderBottom: '3px solid #D81B60' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#D81B60', marginBottom: 2 }}>
            {node.column}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 900, lineHeight: 1.3, textTransform: 'uppercase' }}>
            {node.label}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      {/* Records */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {records.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#888', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
            {node.children.length > 0 ? `${node.children.length} sub-items. Click a leaf node for details.` : 'No detail records.'}
          </p>
        ) : (
          records.map((rec, ri) => (
            <div key={ri} style={{ marginBottom: ri < records.length - 1 ? '1.25rem' : 0 }}>
              {records.length > 1 && (
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#999', marginBottom: '0.5rem' }}>
                  Record {ri + 1} / {records.length}
                </div>
              )}
              {columns.map((col, ci) => {
                const v = clean(rec[col] || '');
                if (!v || v === '—' || v === '-') return null;
                const isActive = col === node.column;
                return (
                  <div key={col} style={{ marginBottom: '0.6rem' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: isActive ? '#D81B60' : '#555', marginBottom: '0.15rem' }}>
                      {col}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.82rem', lineHeight: 1.55, color: '#111',
                      fontWeight: isActive ? 700 : 400,
                      borderLeft: isActive ? '3px solid #D81B60' : '3px solid transparent',
                      paddingLeft: '0.5rem',
                      paddingTop: isActive ? 2 : 0, paddingBottom: isActive ? 2 : 0,
                      background: isActive ? '#FDF4F6' : 'transparent',
                    }}>
                      {v}
                    </div>
                  </div>
                );
              })}
              {ri < records.length - 1 && <div style={{ height: 1, background: '#EEE', margin: '0.75rem 0' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// A single flowchart node
function FlowNode({ node, selected, onSelect }: { node: TreeNode; selected: TreeNode | null; onSelect: (n: TreeNode) => void }) {
  const [open, setOpen] = useState(node.level < 1); // level 0 open by default
  const style = LEVEL_STYLES[Math.min(node.level, LEVEL_STYLES.length - 1)];
  const isSelected = selected?.id === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
      {/* Node row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        {/* Connector dot */}
        <div style={{ width: style.dot.width, height: style.dot.height, background: style.dot.background, flexShrink: 0 }} />

        {/* Node box */}
        <div
          onClick={() => { onSelect(node); if (hasChildren) setOpen(o => !o); }}
          style={{
            ...style.node,
            cursor: 'pointer',
            flex: node.level === 0 ? 1 : undefined,
            minWidth: node.level === 0 ? undefined : 'auto',
            maxWidth: node.level === 2 ? 280 : undefined,
            outline: isSelected ? '3px solid #D81B60' : 'none',
            outlineOffset: 2,
            transition: 'all 100ms',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            userSelect: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isSelected ? '#FDF4F6' : (node.level === 0 ? '#D81B60' : '#F5F5F5'); }}
          onMouseLeave={e => { e.currentTarget.style.background = style.node.background as string; }}
        >
          <span style={{ flex: 1 }}>{node.label}</span>
          {hasChildren && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, opacity: 0.5 }}>
              {open ? '▾' : `▸ ${node.children.length}`}
            </span>
          )}
          {node.records.length > 0 && !hasChildren && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', opacity: 0.5, background: 'rgba(0,0,0,0.08)', padding: '1px 4px' }}>
              {node.records.length}
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div style={{
          marginLeft: node.level === 0 ? 24 : 20,
          marginTop: 4,
          paddingLeft: 12,
          borderLeft: `2px solid ${style.line}`,
          display: 'flex', flexDirection: 'column', gap: 4,
          paddingTop: 4, paddingBottom: 4,
          width: 'calc(100% - 36px)',
        }}>
          {node.children.map(child => (
            <FlowNode key={child.id} node={child} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GraphViewerClient({ material }: Props) {
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState('');
  const [filterCol, setFilterCol] = useState<string | null>(null);

  const structCols = useMemo(() => pickStructuralCols(material.columns), [material.columns]);

  const tree = useMemo(() => buildTreeNodes(material, structCols), [material, structCols]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!search.trim() && !filterCol) return tree;
    const q = search.toLowerCase();

    function matchNode(node: TreeNode): boolean {
      const labelMatch = node.label.toLowerCase().includes(q);
      const colMatch = !filterCol || node.column === filterCol;
      const recordMatch = node.records.some(r =>
        Object.values(r).some(v => clean(v).toLowerCase().includes(q))
      );
      const childMatch = node.children.some(matchNode);
      return (labelMatch || recordMatch || childMatch) && (filterCol ? (colMatch || childMatch) : true);
    }

    function filterNode(node: TreeNode): TreeNode | null {
      const children = node.children.map(filterNode).filter(Boolean) as TreeNode[];
      const self = !q || node.label.toLowerCase().includes(q) ||
        node.records.some(r => Object.values(r).some(v => clean(v).toLowerCase().includes(q)));
      if (!self && children.length === 0) return null;
      return { ...node, children };
    }

    return tree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [tree, search, filterCol]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {/* ── Top bar — app style ── */}
      <div style={{
        flexShrink: 0,
        background: '#000', color: '#FFF',
        borderBottom: '3px solid #D81B60',
        padding: '0 1.25rem',
        height: 56,
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        {/* Title */}
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '-0.02em', flexShrink: 0, maxWidth: 260 }}>
          {material.title}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '0.35rem 0.75rem 0.35rem 2rem', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#D81B60'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
          />
          <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', opacity: 0.5 }}>🔍</span>
        </div>

        {/* Column filter pills */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flex: 1 }}>
          <button
            onClick={() => setFilterCol(null)}
            style={{ padding: '2px 10px', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.58rem', textTransform: 'uppercase', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', background: filterCol === null ? '#D81B60' : 'rgba(255,255,255,0.15)', color: '#FFF' }}
          >ALL</button>
          {material.columns.map(c => (
            <button key={c} onClick={() => setFilterCol(filterCol === c ? null : c)}
              style={{ padding: '2px 10px', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.58rem', textTransform: 'uppercase', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', background: filterCol === c ? '#FFF' : 'rgba(255,255,255,0.12)', color: filterCol === c ? '#000' : '#FFF' }}
            >{c}</button>
          ))}
        </div>

        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
          {filteredTree.length} categories
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Flowchart scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.25rem 1.5rem' }}>
          {filteredTree.length === 0 ? (
            <div style={{ border: 'var(--border-thick)', padding: '3rem', textAlign: 'center', background: '#FFF', boxShadow: 'var(--shadow-btn)' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>
                No results found.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 720 }}>
              {filteredTree.map(node => (
                <FlowNode key={node.id} node={node} selected={selected} onSelect={setSelected} />
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <DetailPanel
            node={selected}
            columns={material.columns}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
