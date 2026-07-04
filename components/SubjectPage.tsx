'use client';

import { useRouter } from 'next/navigation';
import { Map, FileText } from 'lucide-react';

interface ChapterCard {
  id: string;
  name: string;
  batch_count: number;
  material_count: number;
  attempt_count: number;
}

interface Props {
  subjectId: string;
  subjectName: string;
  chapters: ChapterCard[];
}

export default function SubjectPage({ subjectId, subjectName, chapters }: Props) {
  const router = useRouter();
  void subjectId;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Back button */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => router.push('/student')}
        style={{ marginBottom: '1.25rem' }}
      >
        ← Dashboard
      </button>

      {/* Subject heading */}
      <div className="animate-up" style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: 'var(--ink)',
        }}>
          {subjectName}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--cream-dim)',
          marginTop: '0.35rem',
        }}>
          {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chapter list */}
      {chapters.length === 0 ? (
        <div style={{
          border: 'var(--border-thick)',
          background: 'var(--bg-3)',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 900,
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            opacity: 0.4,
          }}>
            No chapters yet.
          </div>
        </div>
      ) : (
        <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {chapters.map(chapter => (
            <div
              key={chapter.id}
              onClick={() => router.push(`/student/chapter/${chapter.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                border: 'var(--border-thick)',
                boxShadow: 'var(--shadow-btn)',
                background: 'var(--bg-3)',
                cursor: 'pointer',
                flexWrap: 'wrap',
                transition: 'background 100ms, box-shadow 100ms, transform 100ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--sage)';
                e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000';
                e.currentTarget.style.transform = 'translate(2px, 2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-3)';
                e.currentTarget.style.boxShadow = 'var(--shadow-btn)';
                e.currentTarget.style.transform = 'translate(0, 0)';
              }}
            >
              {/* Chapter name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.01em',
                  color: 'var(--ink)',
                  lineHeight: 1.2,
                }}>
                  {chapter.name}
                </div>
                {chapter.attempt_count > 0 && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--cream-dim)',
                    marginTop: '0.2rem',
                  }}>
                    {chapter.attempt_count} attempt{chapter.attempt_count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                {chapter.material_count > 0 && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    padding: '2px 8px',
                    background: '#000',
                    color: '#FFF',
                    textTransform: 'uppercase',
                  }}>
                    <Map size={10} /> {chapter.material_count}
                  </span>
                )}
                {chapter.batch_count > 0 && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    padding: '2px 8px',
                    background: 'var(--ruby)',
                    color: '#FFF',
                    textTransform: 'uppercase',
                  }}>
                    <FileText size={10} /> {chapter.batch_count}
                  </span>
                )}
              </div>

              <span style={{ color: 'var(--ruby)', fontSize: '0.9rem', flexShrink: 0 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
