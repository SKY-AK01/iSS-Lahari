'use client';

import { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Attempt {
  id: string;
  mode: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string | null;
  submitted_at: string | null;
  student: { id: string; name: string } | null;
  batch: {
    id: string;
    batch_number: number;
    chapter: { id: string; name: string; subject: { id: string; name: string } } | null;
  } | null;
}

interface Props { attempts: Attempt[] }

export default function MentorResultsClient({ attempts }: Props) {
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<'all' | 'completed' | 'in_progress'>('all');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => attempts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch =
      a.student?.name?.toLowerCase().includes(q) ||
      a.batch?.chapter?.name?.toLowerCase().includes(q) ||
      a.batch?.chapter?.subject?.name?.toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'completed' ? !!a.submitted_at :
      !a.submitted_at;
    return matchSearch && matchFilter;
  }), [attempts, search, filter]);

  // Group: subject → chapter → list of attempts
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Attempt[]>> = {};
    for (const a of filtered) {
      const subj = a.batch?.chapter?.subject?.name ?? 'Unknown Subject';
      const chap = a.batch?.chapter?.name ?? 'Unknown Chapter';
      if (!map[subj]) map[subj] = {};
      if (!map[subj][chap]) map[subj][chap] = [];
      map[subj][chap].push(a);
    }
    return map;
  }, [filtered]);

  function toggleChapter(key: string) {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalCompleted  = attempts.filter(a => !!a.submitted_at).length;
  const totalInProgress = attempts.filter(a => !a.submitted_at).length;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
          All Results
        </h1>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cream-dim)' }}>
            {attempts.length} total attempts
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--sage)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle size={13} /> {totalCompleted} completed
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={13} /> {totalInProgress} in progress
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="animate-up" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: '1 1 240px', maxWidth: '340px' }}>
          <span className="search-icon"><Search size={16} /></span>
          <input
            className="input"
            placeholder="Search student, chapter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)' }}>
          {(['all', 'completed', 'in_progress'] as const).map((f, i) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.45rem 0.9rem',
                border: 'none',
                borderRight: i < 2 ? '2px solid #000' : 'none',
                background: filter === f ? '#000' : 'var(--bg-3)',
                color: filter === f ? '#FFF' : 'var(--ink)',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                transition: 'background 100ms',
              }}
            >
              {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'In Progress'}
            </button>
          ))}
        </div>
      </div>

      {/* Results grouped by subject → chapter */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ border: 'var(--border-thick)', padding: '3rem', textAlign: 'center', background: 'var(--bg-3)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>
            {search || filter !== 'all' ? 'No results match your filter.' : 'No attempts yet.'}
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([subject, chapters]) => (
          <div key={subject} className="animate-up" style={{ marginBottom: '2rem' }}>
            {/* Subject header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.6rem 1rem', background: '#000', color: '#FFF',
              marginBottom: '0.5rem',
            }}>
              <BookOpen size={16} />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {subject}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', opacity: 0.6 }}>
                {Object.values(chapters).flat().length} attempts
              </span>
            </div>

            {/* Chapters */}
            {Object.entries(chapters).map(([chapter, chAttempts]) => {
              const key = `${subject}::${chapter}`;
              const isOpen = expandedChapters.has(key);
              const completed  = chAttempts.filter(a => !!a.submitted_at);
              const inProgress = chAttempts.filter(a => !a.submitted_at);
              const avg = completed.length
                ? completed.filter(a => a.percentage != null).reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.filter(a => a.percentage != null).length
                : 0;

              return (
                <div key={chapter} style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', marginBottom: '0.5rem', background: 'var(--bg-3)' }}>
                  {/* Chapter header — clickable */}
                  <div
                    onClick={() => toggleChapter(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem', cursor: 'pointer', flexWrap: 'wrap' }}
                  >
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.88rem', textTransform: 'uppercase', flex: 1 }}>
                      {chapter}
                    </span>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)' }}>
                        {chAttempts.length} attempt{chAttempts.length !== 1 ? 's' : ''}
                      </span>
                      {completed.length > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--sage)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={11} /> {completed.length} done
                        </span>
                      )}
                      {inProgress.length > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={11} /> {inProgress.length} active
                        </span>
                      )}
                      {avg > 0 && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem',
                          color: avg >= 60 ? 'var(--sage)' : avg >= 40 ? 'var(--partial)' : 'var(--clay)',
                        }}>
                          avg {avg.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>

                  {/* Attempt rows */}
                  {isOpen && (
                    <div style={{ borderTop: '2px solid #000', background: '#FFF' }}>
                      {chAttempts.map(a => {
                        const isSubmitted = !!a.submitted_at;
                        return (
                          <a
                            key={a.id}
                            href={isSubmitted ? `/student/results/${a.id}` : '#'}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.7rem 1.1rem',
                              borderBottom: '1px solid rgba(0,0,0,0.07)',
                              background: '#FFF',
                              cursor: isSubmitted ? 'pointer' : 'default',
                              transition: 'background 100ms',
                              flexWrap: 'wrap',
                            }}
                              onMouseEnter={e => isSubmitted && (e.currentTarget.style.background = 'var(--bg-3)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#FFF')}
                            >
                              {/* Student name */}
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', flex: 1, minWidth: '120px', color: '#000' }}>
                                {a.student?.name ?? 'Unknown'}
                              </span>

                              {/* Batch badge */}
                              <span className="batch-badge">Batch {a.batch?.batch_number}</span>

                              {/* Mode */}
                              <span style={{
                                padding: '2px 8px', fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                textTransform: 'uppercase',
                                background: a.mode === 'exam' ? 'var(--ruby)' : 'var(--sage)',
                                color: a.mode === 'exam' ? '#FFF' : '#000',
                                border: '2px solid #000',
                              }}>
                                {a.mode}
                              </span>

                              {/* Status */}
                              {!isSubmitted ? (
                                <span style={{
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                  fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.68rem',
                                  textTransform: 'uppercase', padding: '2px 8px',
                                  background: '#FF6B00', color: '#FFF', border: '2px solid #000',
                                }}>
                                  <Clock size={10} /> In Progress
                                </span>
                              ) : a.percentage != null ? (
                                <span style={{
                                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem',
                                  minWidth: '52px', textAlign: 'right',
                                  color: a.percentage >= 60 ? 'var(--sage)' : a.percentage >= 40 ? 'var(--partial)' : 'var(--clay)',
                                }}>
                                  {a.percentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)', opacity: 0.5 }}>
                                  No score
                                </span>
                              )}

                              {/* Score fraction */}
                              {isSubmitted && a.score != null && a.max_score != null && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)', opacity: 0.6 }}>
                                  {a.score}/{a.max_score}
                                </span>
                              )}

                              {/* Date */}
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--cream-dim)', opacity: 0.4, minWidth: '70px', textAlign: 'right' }}>
                                {isSubmitted
                                  ? new Date(a.submitted_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                  : a.started_at ? new Date(a.started_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
