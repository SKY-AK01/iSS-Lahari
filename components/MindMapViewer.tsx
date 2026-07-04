'use client';

import { useState } from 'react';
import { MindMapJSON } from '@/lib/types';

interface Props {
  material: MindMapJSON;
  materialId?: string;
}

export default function MindMapViewer({ material, materialId }: Props) {
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Filter rows by search across all column values
  const filtered = material.records.filter(row =>
    !search.trim() ||
    Object.values(row).some(val =>
      val?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Helper to strip HTML tags for search comparison, render with HTML for display
  function renderCell(html: string) {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: html.replace(/<br\s*\/?>/gi, '<br/>'),
        }}
      />
    );
  }

  // First column is typically "Year" — treat it as the primary key/label
  const [firstCol, ...restCols] = material.columns;

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search this timeline…"
          value={search}
          onChange={e => { setSearch(e.target.value); setExpandedRow(null); }}
          style={{ maxWidth: '320px', fontSize: '0.88rem', padding: '0.55rem 1rem' }}
        />
        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', opacity: 0.6, flex: 1 }}>
          {filtered.length} / {material.records.length} rows
        </span>
        {materialId && (
          <a
            href={`/graph/${materialId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            Graph View
          </a>
        )}
      </div>

      {/* Desktop: full table */}
      <div className="mind-map-table-wrap" style={{ overflowX: 'auto', border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFF' }}>
              {material.columns.map((col, i) => (
                <th
                  key={col}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    borderRight: i < material.columns.length - 1 ? '1px solid #333' : 'none',
                    minWidth: i === 0 ? '60px' : i === material.columns.length - 1 ? '80px' : '160px',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={material.columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  No records match your search.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '2px solid #000',
                    background: i % 2 === 0 ? '#FFFFFF' : '#F4F4F0',
                    cursor: 'pointer',
                    transition: 'background 100ms',
                  }}
                  onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#F4F4F0')}
                >
                  {material.columns.map((col, ci) => (
                    <td
                      key={col}
                      style={{
                        padding: '0.75rem 1rem',
                        verticalAlign: 'top',
                        borderRight: ci < material.columns.length - 1 ? '1px solid #DDD' : 'none',
                        fontFamily: ci === 0 ? 'var(--font-mono)' : 'var(--font-body)',
                        fontWeight: ci === 0 ? 800 : 400,
                        fontSize: ci === 0 ? '0.9rem' : '0.83rem',
                        lineHeight: 1.5,
                        color: 'var(--ink)',
                        maxWidth: ci > 1 && ci < material.columns.length - 1 ? '320px' : 'none',
                      }}
                    >
                      {renderCell(row[col] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card view for mobile / expanded detail */}
      <div className="mind-map-cards" style={{ display: 'none' }}>
        {filtered.map((row, i) => (
          <div
            key={i}
            className="card"
            style={{ padding: '1rem', marginBottom: '0.75rem', cursor: 'pointer' }}
            onClick={() => setExpandedRow(expandedRow === i ? null : i)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', display: 'block' }}>
                  {row[firstCol]}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem', display: 'block' }}>
                  {row[restCols[0]]}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{expandedRow === i ? '▲' : '▼'}</span>
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

      {/* References */}
      {material.references && Object.keys(material.references).length > 0 && (
        <details style={{ marginTop: '1.5rem' }}>
          <summary style={{
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.8rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '0.5rem 0',
            borderTop: '2px solid #000',
            userSelect: 'none',
          }}>
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
