'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, FileText, Filter } from 'lucide-react';

interface Paper {
  id: string;
  paper_name: string;
  year: number;
  exam_type: string;
  pdf_url: string | null;
  has_images: boolean;
  total_questions: number;
}

interface Props {
  papers: Paper[];
  years: number[];
  examTypes: string[];
}

const TYPE_LABELS: Record<string, string> = {
  'UPSC Prelims GS Paper 1': 'GS1',
  'UPSC Prelims CSAT':       'CSAT',
  'UPSC Mains GS Paper 1':   'GS1',
  'UPSC Mains GS Paper 2':   'GS2',
  'UPSC Mains GS Paper 3':   'GS3',
  'UPSC Mains GS Paper 4':   'GS4',
  'UPSC Mains Essay':        'Essay',
};

const TYPE_COLORS: Record<string, string> = {
  'UPSC Prelims GS Paper 1': 'var(--ruby)',
  'UPSC Prelims CSAT':       '#6B4FBB',
  'UPSC Mains GS Paper 1':   '#1a6b3c',
  'UPSC Mains GS Paper 2':   '#1a4a6b',
  'UPSC Mains GS Paper 3':   '#6b3a1a',
  'UPSC Mains GS Paper 4':   '#1a5a6b',
  'UPSC Mains Essay':        '#444',
};

export default function PYQBrowserClient({ papers, years, examTypes }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Prelims' | 'Mains'>('All');
  const [view, setView] = useState<'grid' | 'year'>('year');

  const filtered = useMemo(() => {
    return papers.filter(p => {
      if (selectedCategory === 'Prelims' && !p.exam_type.includes('Prelims')) return false;
      if (selectedCategory === 'Mains' && !p.exam_type.includes('Mains')) return false;
      if (selectedYear && p.year !== selectedYear) return false;
      if (selectedType && p.exam_type !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.exam_type.toLowerCase().includes(q) || String(p.year).includes(q) || p.paper_name.includes(q);
      }
      return true;
    });
  }, [papers, selectedCategory, selectedYear, selectedType, search]);

  // Group by year for year view
  const byYear = useMemo(() => {
    const map: Record<number, Paper[]> = {};
    filtered.forEach(p => {
      if (!map[p.year]) map[p.year] = [];
      map[p.year].push(p);
    });
    return Object.entries(map)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, ps]) => ({ year: Number(year), papers: ps }));
  }, [filtered]);

  const prelimsCount = papers.filter(p => p.exam_type.includes('Prelims')).length;
  const mainsCount   = papers.filter(p => p.exam_type.includes('Mains')).length;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '1.75rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student')} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          UPSC<br /><span style={{ color: 'var(--ruby)' }}>PYQ Papers</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cream-dim)', marginTop: '0.35rem' }}>
          {papers.length} papers · {prelimsCount} Prelims · {mainsCount} Mains · 2018–2025
        </div>
      </div>

      {/* Category Tabs */}
      <div className="animate-up" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
        {(['All', 'Prelims', 'Mains'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSelectedType(null); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.75rem 1rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '1rem',
              textTransform: 'uppercase',
              color: selectedCategory === cat ? 'var(--ruby)' : 'var(--cream-dim)',
              borderBottom: selectedCategory === cat ? '4px solid var(--ruby)' : '4px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 100ms'
            }}
          >
            {cat} {cat === 'Prelims' ? `(${prelimsCount})` : cat === 'Mains' ? `(${mainsCount})` : `(${papers.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="animate-up" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px', maxWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cream-dim)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Search papers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', fontSize: '0.85rem', padding: '0.5rem 0.75rem 0.5rem 2.2rem' }}
          />
        </div>

        {/* Year filter */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedYear === null ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedYear(null)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
          >All</button>
          {years.map(y => (
            <button
              key={y}
              className={`btn btn-sm ${selectedYear === y ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedYear(selectedYear === y ? null : y)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
            >{y}</button>
          ))}
        </div>

        {/* Exam type filter */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${selectedType === null ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedType(null)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
          ><Filter size={12} /> All Types</button>
          {examTypes.map(t => (
            <button
              key={t}
              className={`btn btn-sm ${selectedType === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedType(selectedType === t ? null : t)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
            >{TYPE_LABELS[t] ?? t}</button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)' }}>
          {(['year', 'grid'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{ padding: '0.4rem 0.75rem', border: 'none', borderRight: v === 'year' ? '2px solid #000' : 'none', background: view === v ? 'var(--ruby)' : 'var(--bg-3)', color: view === v ? '#FFF' : 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', transition: 'background 100ms' }}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cream-dim)', marginBottom: '1rem', opacity: 0.7 }}>
        {filtered.length} paper{filtered.length !== 1 ? 's' : ''} shown
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div style={{ border: 'var(--border-thick)', padding: '3rem', textAlign: 'center', background: 'var(--bg-3)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>
            No papers match your filters.
          </div>
        </div>
      )}

      {/* Year grouped view */}
      {view === 'year' && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {byYear.map(({ year, papers: ps }) => (
            <div key={year}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream-dim)', marginBottom: '0.6rem', paddingBottom: '0.4rem', borderBottom: '2px solid #000' }}>
                {year}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
                {ps.map(p => <PaperCard key={p.id} paper={p} onClick={() => router.push(`/student/pyq/${p.id}`)} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
          {filtered.map(p => <PaperCard key={p.id} paper={p} onClick={() => router.push(`/student/pyq/${p.id}`)} />)}
        </div>
      )}
    </div>
  );
}

function PaperCard({ paper, onClick }: { paper: Paper; onClick: () => void }) {
  const shortLabel = TYPE_LABELS[paper.exam_type] ?? paper.exam_type;
  const color = TYPE_COLORS[paper.exam_type] ?? 'var(--ink)';
  const isPrelims = paper.exam_type.includes('Prelims');

  return (
    <div
      style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', background: 'var(--bg-3)', overflow: 'hidden', cursor: 'pointer', transition: 'all 100ms' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 0 #000'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = 'var(--shadow-btn)'; }}
    >
      {/* Color header stripe */}
      <div
        style={{ background: color, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={onClick}
      >
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: '#FFF', letterSpacing: '-0.02em' }}>
          {paper.year}
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', color: '#FFF', padding: '2px 8px', border: '1.5px solid rgba(255,255,255,0.4)' }}>
          {isPrelims ? 'Prelims' : 'Mains'}
        </span>
      </div>

      <div style={{ padding: '0.75rem 1rem', cursor: 'pointer' }} onClick={onClick}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.3rem', color }}>
          {shortLabel}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cream-dim)', marginBottom: '0.5rem', opacity: 0.7 }}>
          {paper.total_questions} questions
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <button
            onClick={onClick}
            style={{ flex: 1, fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', background: '#000', color: '#FFF', border: '2px solid #000', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
          >
            <FileText size={10} /> Browse
          </button>
          {paper.pdf_url && (
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', background: 'var(--bg-3)', color: 'var(--ink)', border: '2px solid #000', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              title="Download PDF"
            >
              <Download size={10} /> PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
