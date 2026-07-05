'use client';

import { useState } from 'react';
import { MindMapJSON } from '@/lib/types';
import { LayoutList, CreditCard, Table2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface Props {
  material: MindMapJSON;
  materialId?: string;
}

type ViewMode = 'table' | 'cards' | 'flashcards';

export default function MindMapViewer({ material, materialId }: Props) {
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Flashcard state
  const [fcIndex, setFcIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filtered = material.records.filter(row =>
    !search.trim() ||
    Object.values(row).some(val =>
      val?.toLowerCase().includes(search.toLowerCase())
    )
  );

  function renderCell(html: string) {
    return (
      <span dangerouslySetInnerHTML={{ __html: html.replace(/<br\s*\/?>/gi, '<br/>') }} />
    );
  }

  const [firstCol, ...restCols] = material.columns;

  // Reset flashcard index when search changes
  function handleSearch(val: string) {
    setSearch(val);
    setExpandedRow(null);
    setFcIndex(0);
    setFlipped(false);
  }

  // ── Flashcard helpers ──────────────────────────────────────
  const currentCard = filtered[fcIndex];

  function fcNext() { setFlipped(false); setTimeout(() => setFcIndex(i => Math.min(i + 1, filtered.length - 1)), 150); }
  function fcPrev() { setFlipped(false); setTimeout(() => setFcIndex(i => Math.max(i - 1, 0)), 150); }

  // Key fields to show on front vs back of card
  const frontFields = [firstCol, restCols[0]].filter(Boolean);
  const backFields = restCols.slice(1);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ maxWidth: '240px', fontSize: '0.88rem', padding: '0.55rem 1rem', flex: '1 1 160px' }}
        />
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', opacity: 0.6 }}>
          {filtered.length}/{material.records.length}
        </span>

        {/* View toggle */}
        <div style={{ display: 'flex', border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', marginLeft: 'auto' }}>
          {([
            { mode: 'table' as ViewMode, icon: <Table2 size={14} />, label: 'Table' },
            { mode: 'cards' as ViewMode, icon: <LayoutList size={14} />, label: 'List' },
            { mode: 'flashcards' as ViewMode, icon: <CreditCard size={14} />, label: 'Cards' },
          ]).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setFcIndex(0); setFlipped(false); }}
              title={label}
              style={{
                padding: '0.45rem 0.75rem',
                border: 'none',
                borderRight: mode !== 'flashcards' ? '3px solid #000' : 'none',
                background: viewMode === mode ? 'var(--ruby)' : 'var(--bg-3)',
                color: viewMode === mode ? '#FFF' : 'var(--ink)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                transition: 'background 100ms',
              }}
            >
              {icon}
              <span className="view-mode-label">{label}</span>
            </button>
          ))}
        </div>

        {materialId && (
          <a
            href={`/graph/${materialId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            Graph
          </a>
        )}
      </div>

      {/* ── TABLE VIEW ─────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div style={{ overflowX: 'auto', border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#000', color: '#FFF' }}>
                {material.columns.map((col, i) => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontFamily: 'var(--font-heading)', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderRight: i < material.columns.length - 1 ? '1px solid #333' : 'none', minWidth: i === 0 ? '60px' : i === material.columns.length - 1 ? '80px' : '160px' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={material.columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>No records match your search.</td></tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '2px solid #000', background: i % 2 === 0 ? '#FFFFFF' : '#F4F4F0', cursor: 'pointer', transition: 'background 100ms' }}
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#F4F4F0')}
                  >
                    {material.columns.map((col, ci) => (
                      <td key={col} style={{ padding: '0.75rem 1rem', verticalAlign: 'top', borderRight: ci < material.columns.length - 1 ? '1px solid #DDD' : 'none', fontFamily: ci === 0 ? 'var(--font-mono)' : 'var(--font-body)', fontWeight: ci === 0 ? 800 : 400, fontSize: ci === 0 ? '0.9rem' : '0.83rem', lineHeight: 1.5, color: 'var(--ink)', maxWidth: ci > 1 && ci < material.columns.length - 1 ? '320px' : 'none' }}>
                        {renderCell(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LIST/CARDS VIEW ────────────────────────────────── */}
      {viewMode === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>No records match.</div>
          )}
          {filtered.map((row, i) => (
            <div key={i} className="card" style={{ padding: '1rem', cursor: 'pointer', boxShadow: '3px 3px 0 0 #000' }} onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', display: 'block', color: 'var(--ruby)' }}>{row[firstCol]}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem', display: 'block' }}>{row[restCols[0]]}</span>
                </div>
                <span style={{ fontSize: '0.75rem', opacity: 0.4, flexShrink: 0 }}>{expandedRow === i ? '▲' : '▼'}</span>
              </div>
              {expandedRow === i && (
                <div style={{ marginTop: '0.75rem', borderTop: '2px solid #000', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {restCols.map(col => (
                    <div key={col}>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.2rem' }}>{col}</div>
                      <div style={{ fontSize: '0.84rem', lineHeight: 1.5 }}>{renderCell(row[col] ?? '—')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FLASHCARD VIEW ─────────────────────────────────── */}
      {viewMode === 'flashcards' && (
        <div>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>No records match.</div>
          ) : (
            <>
              {/* Progress */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--cream-dim)' }}>
                  {fcIndex + 1} / {filtered.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.5 }}>
                    {flipped ? 'Showing Back' : 'Tap to flip'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '5px', background: '#E0E0E0', border: '2px solid #000', marginBottom: '1.5rem' }}>
                <div style={{ height: '100%', width: `${((fcIndex + 1) / filtered.length) * 100}%`, background: 'var(--ruby)', transition: 'width 200ms ease' }} />
              </div>

              {/* Flip card */}
              <div
                onClick={() => setFlipped(f => !f)}
                style={{
                  perspective: '1200px',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  userSelect: 'none',
                  minHeight: '280px',
                }}
              >
                <div style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '280px',
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1)',
                }}>
                  {/* FRONT */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backfaceVisibility: 'hidden',
                    border: 'var(--border-thick)',
                    boxShadow: 'var(--shadow-hard)',
                    background: 'var(--bg-3)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '0.75rem',
                    minHeight: '280px',
                  }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.4, marginBottom: '0.5rem' }}>
                      {frontFields[0]}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 3rem)', lineHeight: 1.1, color: 'var(--ruby)' }}>
                      {currentCard?.[firstCol] ?? '—'}
                    </div>
                    {restCols[0] && currentCard?.[restCols[0]] && (
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', textTransform: 'uppercase', letterSpacing: '-0.01em', maxWidth: '480px' }}>
                        {renderCell(currentCard[restCols[0]])}
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontSize: '0.65rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.3 }}>
                      Tap to see details →
                    </div>
                  </div>

                  {/* BACK */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    border: 'var(--border-thick)',
                    boxShadow: 'var(--shadow-hard)',
                    background: '#FFF',
                    padding: '1.5rem',
                    overflowY: 'auto',
                    minHeight: '280px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      {backFields.filter(col => currentCard?.[col]).map(col => (
                        <div key={col} style={{ borderLeft: '3px solid var(--ruby)', paddingLeft: '0.75rem' }}>
                          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: '0.2rem' }}>{col}</div>
                          <div style={{ fontSize: '0.82rem', lineHeight: 1.5, fontWeight: 500, textTransform: 'none' }}>{renderCell(currentCard[col])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={fcPrev} disabled={fcIndex === 0} style={{ gap: '0.4rem' }}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setFcIndex(0); setFlipped(false); }}
                  style={{ gap: '0.4rem', opacity: 0.6 }}
                  title="Restart"
                >
                  <RotateCcw size={14} />
                </button>
                <button className="btn btn-primary" onClick={fcNext} disabled={fcIndex === filtered.length - 1} style={{ gap: '0.4rem' }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* References */}
      {material.references && Object.keys(material.references).length > 0 && (
        <details style={{ marginTop: '1.5rem' }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.5rem 0', borderTop: '2px solid #000', userSelect: 'none' }}>
            References ({Object.keys(material.references).length})
          </summary>
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {Object.entries(material.references).map(([key, val]) => (
              <div key={key} style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', lineHeight: 1.5, color: 'var(--cream-dim)' }}>
                <span style={{ fontWeight: 700, marginRight: '0.5rem' }}>{key}</span>{val}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}



