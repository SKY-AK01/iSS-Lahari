'use client';

import { useState } from 'react';
import { Search, BookOpen } from 'lucide-react';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attempts: any[];
}

export default function MentorResultsClient({ attempts }: Props) {
  const [search, setSearch] = useState('');

  const filtered = attempts.filter(a => {
    const q = search.toLowerCase();
    return (
      a.student?.name?.toLowerCase().includes(q) ||
      a.batch?.chapter?.name?.toLowerCase().includes(q) ||
      a.batch?.chapter?.subject?.name?.toLowerCase().includes(q)
    );
  });

  // Group by subject → chapter with average scores
  const grouped: Record<string, Record<string, { attempts: typeof attempts; avg: number }>> = {};
  for (const a of filtered) {
    const subj = a.batch?.chapter?.subject?.name ?? 'Unknown';
    const chap = a.batch?.chapter?.name ?? 'Unknown';
    if (!grouped[subj]) grouped[subj] = {};
    if (!grouped[subj][chap]) grouped[subj][chap] = { attempts: [], avg: 0 };
    grouped[subj][chap].attempts.push(a);
  }
  for (const subj of Object.keys(grouped)) {
    for (const chap of Object.keys(grouped[subj])) {
      const pcts = grouped[subj][chap].attempts.filter((a: { percentage: number | null }) => a.percentage != null).map((a: { percentage: number }) => a.percentage);
      grouped[subj][chap].avg = pcts.length ? pcts.reduce((s: number, v: number) => s + v, 0) / pcts.length : 0;
    }
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <h1>All Results</h1>
        <p style={{ marginTop: '0.4rem' }}>{attempts.length} total attempt{attempts.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="search-box animate-up" style={{ marginBottom: '1.5rem', maxWidth: '340px' }}>
        <span className="search-icon"><Search size={16} /></span>
        <input
          id="results-search"
          className="input"
          placeholder="Search student, chapter…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
        />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          No submitted attempts yet.
        </div>
      ) : (
        Object.entries(grouped).map(([subject, chapters]) => (
          <div key={subject} className="animate-up" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--ruby)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} /> {subject}
            </h2>
            {Object.entries(chapters).map(([chapter, { attempts: chAttempts, avg }]) => (
              <div key={chapter} className="card" style={{ marginBottom: '0.75rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>{chapter}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', opacity: 0.6 }}>{chAttempts.length} attempt{chAttempts.length !== 1 ? 's' : ''}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem',
                      color: avg >= 60 ? 'var(--sage)' : avg >= 40 ? 'var(--partial)' : 'var(--clay)',
                    }}>
                      avg {avg.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {chAttempts.map((a: {
                    id: string;
                    student: { name: string };
                    batch: { batch_number: number };
                    mode: string;
                    percentage: number | null;
                    score: number | null;
                    max_score: number | null;
                    submitted_at: string | null;
                  }) => (
                    <a
                      key={a.id}
                      href={`/student/results/${a.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.65rem 0.9rem', background: 'var(--bg-3)',
                        borderRadius: 'var(--radius-sm)', flexWrap: 'wrap',
                        transition: 'background 200ms', cursor: 'pointer',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-4)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', flex: 1 }}>{a.student?.name}</span>
                        <span className="batch-badge">Batch {a.batch?.batch_number}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                          background: a.mode === 'exam' ? 'var(--ruby-subtle)' : 'var(--sage-bg)',
                          color: a.mode === 'exam' ? 'var(--ruby)' : 'var(--sage)',
                          border: `1px solid ${a.mode === 'exam' ? 'var(--ruby-glow)' : 'rgba(143,175,138,0.3)'}`,
                        }}>
                          {a.mode}
                        </span>
                        {a.percentage != null && (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', minWidth: '52px', textAlign: 'right',
                            color: a.percentage >= 60 ? 'var(--sage)' : a.percentage >= 40 ? 'var(--partial)' : 'var(--clay)',
                          }}>
                            {a.percentage.toFixed(1)}%
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.4 }}>
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
