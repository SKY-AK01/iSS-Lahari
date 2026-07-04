'use client';

import { useRouter } from 'next/navigation';
import { Map, FileText, BookOpen } from 'lucide-react';

interface SubjectCard {
  id: string;
  name: string;
  chapter_count: number;
  material_count: number;
  batch_count: number;
}

interface RecentAttempt {
  id: string;
  subject_name: string;
  chapter_name: string;
  batch_number: number;
  mode: string;
  percentage: number | null;
  submitted_at: string;
}

interface Stats {
  total_attempts: number;
  avg_score: number | null;
  best_score: number | null;
}

interface Props {
  name: string;
  subjects: SubjectCard[];
  stats: Stats;
  recentAttempts: RecentAttempt[];
}

function scoreColor(pct: number) {
  if (pct >= 60) return 'var(--sage)';
  if (pct >= 40) return '#888';
  return 'var(--ruby)';
}

export default function StudentDashboard({ name, subjects, stats, recentAttempts }: Props) {
  const router = useRouter();

  const totalSubjects = subjects.length;
  const totalChapters = subjects.reduce((n, s) => n + s.chapter_count, 0);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Greeting */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: 'var(--ink)',
        }}>
          Welcome back,<br />
          <span style={{ color: 'var(--ruby)' }}>{name}</span>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="animate-up"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Subjects', value: totalSubjects },
          { label: 'Chapters', value: totalChapters },
          { label: 'Attempts', value: stats.total_attempts },
          {
            label: 'Avg Score',
            value: stats.avg_score != null ? `${stats.avg_score.toFixed(1)}%` : '—',
            color: stats.avg_score != null ? scoreColor(stats.avg_score) : undefined,
          },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              border: 'var(--border-thick)',
              boxShadow: 'var(--shadow-hard)',
              background: 'var(--bg-3)',
              padding: '1.1rem 1.25rem',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '1.6rem',
              lineHeight: 1,
              color: stat.color ?? 'var(--ink)',
              marginBottom: '0.3rem',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--cream-dim)',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <div className="animate-up" style={{ marginBottom: '2.5rem' }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.75rem',
            color: 'var(--cream-dim)',
          }}>
            Recent Attempts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {recentAttempts.map(attempt => (
              <div
                key={attempt.id}
                onClick={() => router.push(`/student/results/${attempt.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  border: 'var(--border-thick)',
                  boxShadow: 'var(--shadow-btn)',
                  background: 'var(--bg-3)',
                  cursor: 'pointer',
                  flexWrap: 'wrap',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-3)')}
              >
                {/* Subject > Chapter */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {attempt.subject_name}
                    <span style={{ color: 'var(--cream-dim)', fontWeight: 400 }}> › </span>
                    {attempt.chapter_name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--cream-dim)',
                    marginTop: '0.15rem',
                  }}>
                    Batch {attempt.batch_number} ·{' '}
                    {new Date(attempt.submitted_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: '2-digit',
                    })}
                  </div>
                </div>

                {/* Mode badge */}
                <span style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  padding: '2px 8px',
                  background: attempt.mode === 'exam' ? 'var(--ruby)' : '#000',
                  color: '#FFF',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {attempt.mode}
                </span>

                {/* Score */}
                {attempt.percentage != null && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    color: scoreColor(attempt.percentage),
                    flexShrink: 0,
                  }}>
                    {attempt.percentage.toFixed(1)}%
                  </span>
                )}

                <span style={{ fontSize: '0.85rem', color: 'var(--ruby)', flexShrink: 0 }}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Grid */}
      <div className="animate-up">
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.75rem',
          color: 'var(--cream-dim)',
        }}>
          Subjects
        </div>

        {subjects.length === 0 ? (
          <div
            style={{
              border: 'var(--border-thick)',
              background: 'var(--bg-3)',
              padding: '3rem',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              opacity: 0.4,
            }}>
              No subjects yet. Check back soon.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}>
            {subjects.map(subject => (
              <div
                key={subject.id}
                onClick={() => router.push(`/student/subject/${subject.id}`)}
                style={{
                  border: 'var(--border-thick)',
                  boxShadow: 'var(--shadow-hard)',
                  background: 'var(--bg-3)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'background 100ms, box-shadow 100ms, transform 100ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--sage)';
                  e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000';
                  e.currentTarget.style.transform = 'translate(3px, 3px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-3)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-hard)';
                  e.currentTarget.style.transform = 'translate(0,0)';
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  color: 'var(--ink)',
                  marginBottom: '0.85rem',
                  lineHeight: 1.2,
                }}>
                  {subject.name}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    padding: '2px 8px',
                    background: '#000',
                    color: '#FFF',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}>
                    <BookOpen size={10} /> {subject.chapter_count}
                  </span>
                  {subject.material_count > 0 && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      padding: '2px 8px',
                      background: '#000',
                      color: '#FFF',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      <Map size={10} /> {subject.material_count}
                    </span>
                  )}
                  {subject.batch_count > 0 && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      padding: '2px 8px',
                      background: 'var(--ruby)',
                      color: '#FFF',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      <FileText size={10} /> {subject.batch_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
