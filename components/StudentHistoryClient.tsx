'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, BarChart2 } from 'lucide-react';

interface Attempt {
  id: string;
  mode: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string;
  submitted_at: string | null;
  batch: {
    id: string;
    batch_number: number;
    chapter: { name: string; subject: { name: string } };
  } | null;
}

interface Props {
  attempts: Attempt[];
}

export default function StudentHistoryClient({ attempts }: Props) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'timeline' | 'byChapter'>('byChapter');
  const router = useRouter();

  const filtered = attempts.filter(a => {
    const q = search.toLowerCase();
    return (
      !q ||
      a.batch?.chapter?.name?.toLowerCase().includes(q) ||
      a.batch?.chapter?.subject?.name?.toLowerCase().includes(q)
    );
  });

  function scoreColor(pct: number) {
    return pct >= 60 ? 'var(--sage)' : pct >= 40 ? 'var(--partial)' : 'var(--ruby)';
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── By Chapter view ──────────────────────────────────────────────────
  const grouped: Record<string, Record<string, Attempt[]>> = {};
  for (const a of filtered) {
    const subj = a.batch?.chapter?.subject?.name ?? 'Unknown';
    const chap = a.batch?.chapter?.name ?? 'Unknown';
    if (!grouped[subj]) grouped[subj] = {};
    if (!grouped[subj][chap]) grouped[subj][chap] = [];
    grouped[subj][chap].push(a);
  }

  const AttemptRow = ({ a }: { a: Attempt }) => (
    <div
      onClick={() => router.push(`/student/results/${a.id}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 0.9rem',
        border: 'var(--border-thin)',
        background: 'var(--bg-3)',
        cursor: 'pointer',
        flexWrap: 'wrap',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-3)')}
    >
      <span style={{
        fontSize: '0.7rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
        padding: '2px 8px',
        background: a.mode === 'exam' ? 'var(--ruby)' : '#000',
        color: '#FFF',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {a.mode}
      </span>
      <span className="batch-badge" style={{ flexShrink: 0 }}>Batch {a.batch?.batch_number}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.55, flex: 1, minWidth: '100px' }}>
        {a.submitted_at ? formatDate(a.submitted_at) : '—'}
      </span>
      {a.percentage != null ? (
        <>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: scoreColor(a.percentage), flexShrink: 0 }}>
            {a.percentage.toFixed(1)}%
          </span>
          {a.score != null && a.max_score != null && (
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.45, flexShrink: 0 }}>
              {a.score}/{a.max_score}
            </span>
          )}
        </>
      ) : (
        <span style={{ fontSize: '0.75rem', opacity: 0.4, fontFamily: 'var(--font-mono)' }}>—</span>
      )}
      <span style={{ fontSize: '0.78rem', color: 'var(--ruby)', flexShrink: 0 }}>→</span>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '1.5rem' }}>
        <h1>History</h1>
        <p style={{ marginTop: '0.4rem' }}>
          {attempts.length} attempt{attempts.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: '1 1 220px', maxWidth: '320px' }}>
          <span className="search-icon"><Search size={16} /></span>
          <input
            id="history-search"
            className="input"
            placeholder="Search subjects or chapters…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
          />
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', border: 'var(--border-thick)', overflow: 'hidden' }}>
          <button
            className="btn btn-sm"
            onClick={() => setView('byChapter')}
            style={{ background: view === 'byChapter' ? '#000' : 'var(--bg-3)', color: view === 'byChapter' ? '#FFF' : 'var(--ink)', border: 'none', boxShadow: 'none', borderRight: 'var(--border-thick)' }}
          >
            <BookOpen size={14} /> Chapter
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setView('timeline')}
            style={{ background: view === 'timeline' ? '#000' : 'var(--bg-3)', color: view === 'timeline' ? '#FFF' : 'var(--ink)', border: 'none', boxShadow: 'none' }}
          >
            <BarChart2 size={14} /> Timeline
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          {search ? 'No results found.' : 'No attempts yet. Take a test to see your history!'}
        </div>
      ) : view === 'timeline' ? (

        /* ── Timeline view ───────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {filtered.map(a => (
            <div key={a.id}>
              {/* Date label — show when date changes */}
              <AttemptRow a={a} />
            </div>
          ))}
        </div>

      ) : (

        /* ── By Chapter view ─────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(grouped).map(([subject, chapters]) => {
            const subjectTotal = Object.values(chapters).reduce((n, arr) => n + arr.length, 0);
            return (
              <div key={subject} className="animate-up">
                {/* Subject header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  marginBottom: '0.75rem',
                  borderBottom: 'var(--border-thick)',
                  paddingBottom: '0.5rem',
                }}>
                  <BookOpen size={16} />
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase' }}>{subject}</span>
                  <span className="batch-badge">{subjectTotal}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(chapters).map(([chapter, chAttempts]) => {
                    const pcts = chAttempts.filter(a => a.percentage != null).map(a => a.percentage!);
                    const avg = pcts.length ? pcts.reduce((s, v) => s + v, 0) / pcts.length : null;
                    const best = pcts.length ? Math.max(...pcts) : null;
                    const examCount = chAttempts.filter(a => a.mode === 'exam').length;
                    const practiceCount = chAttempts.filter(a => a.mode === 'practice').length;

                    return (
                      <div key={chapter} className="card" style={{ padding: '1.1rem', overflow: 'hidden' }}>
                        {/* Chapter summary row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.88rem', textTransform: 'uppercase', lineHeight: 1.2 }}>{chapter}</div>
                            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', marginTop: '0.2rem', opacity: 0.6 }}>
                              {practiceCount > 0 && `${practiceCount} practice`}
                              {practiceCount > 0 && examCount > 0 && ' · '}
                              {examCount > 0 && `${examCount} exam`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {avg != null && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.4 }}>avg</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: scoreColor(avg) }}>{avg.toFixed(1)}%</div>
                              </div>
                            )}
                            {best != null && best !== avg && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.4 }}>best</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: scoreColor(best) }}>{best.toFixed(1)}%</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Attempts list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {chAttempts.map(a => <AttemptRow key={a.id} a={a} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
