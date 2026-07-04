'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';

interface Batch {
  id: string;
  batch_number: number;
  question_count: number;
  difficulty_mix: Record<string, number> | null;
  created_at: string;
}

interface Chapter {
  id: string;
  name: string;
  test_batches: Batch[];
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface Props {
  subjects: Subject[];
  attemptedBatchIds: string[];
}

export default function StudentTestBrowser({ subjects, attemptedBatchIds }: Props) {
  const [search, setSearch] = useState('');
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set(subjects.map(s => s.id)));
  const router = useRouter();
  const attemptedSet = new Set(attemptedBatchIds);

  function toggleSubject(id: string) {
    setOpenSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.chapters.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <h1>Choose a Test</h1>
        <p style={{ marginTop: '0.4rem' }}>
          Browse by subject and chapter, then pick Practice or Exam mode.
        </p>
      </div>

      {/* Search */}
      <div className="search-box animate-up" style={{ marginBottom: '1.5rem', maxWidth: '360px' }}>
        <span className="search-icon"><Search size={16} /></span>
        <input
          id="student-search"
          className="input"
          placeholder="Search subjects or chapters…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
        />
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          {search ? 'No chapters match your search.' : 'No tests available yet. Check back soon!'}
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredSubjects.map(subject => {
            const isOpen = openSubjects.has(subject.id);
            const totalBatches = subject.chapters.reduce((n, c) => n + c.test_batches.length, 0);

            return (
              <div key={subject.id} className="animate-up">
                <div
                  className={`collapsible-header ${isOpen ? 'open' : ''}`}
                  onClick={() => toggleSubject(subject.id)}
                  id={`subject-${subject.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>
                      {subject.name}
                    </span>
                    <span className="batch-badge">{totalBatches} batch{totalBatches !== 1 ? 'es' : ''}</span>
                  </div>
                  <span className={`chevron ${isOpen ? 'open' : ''}`} style={{ display: 'flex' }}><ChevronRight size={18} /></span>
                </div>

                {isOpen && (
                  <div style={{
                    background: 'var(--bg-2)',
                    border: '1px solid rgba(250,160,160,0.15)',
                    borderTop: 'none',
                    borderRadius: '0 0 var(--radius) var(--radius)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}>
                    {subject.chapters.map(chapter => (
                      <div key={chapter.id}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream-dim)', marginBottom: '0.6rem', paddingLeft: '0.25rem', letterSpacing: '0.01em' }}>
                          {chapter.name}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                          {chapter.test_batches.map(batch => {
                            const done = attemptedSet.has(batch.id);
                            const mix = batch.difficulty_mix;

                            return (
                              <div
                                key={batch.id}
                                className="admit-card"
                                style={{ flexBasis: '200px', flexGrow: 1 }}
                                onClick={() => router.push(`/student/test/${batch.id}`)}
                                id={`batch-${batch.id}`}
                              >
                                <div className="admit-card-header">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700 }}>
                                      Batch {batch.batch_number}
                                    </span>
                                    {done && (
                                      <span style={{
                                        fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                                        padding: '1px 7px', borderRadius: '999px',
                                        background: 'var(--sage-bg)', color: 'var(--sage)',
                                        border: '1px solid rgba(143,175,138,0.3)',
                                      }}>
                                        ✓ done
                                      </span>
                                    )}
                                  </div>
                                  <span className="batch-badge">{batch.question_count} Qs</span>
                                </div>
                                <div className="admit-card-body">
                                  {mix && (
                                    <>
                                      <div className="admit-card-stat">
                                        <span className="label">E</span>
                                        <span className="value" style={{ color: 'var(--sage)' }}>{mix.easy || 0}</span>
                                      </div>
                                      <div className="admit-card-stat">
                                        <span className="label">M</span>
                                        <span className="value" style={{ color: 'var(--partial)' }}>{mix.medium || 0}</span>
                                      </div>
                                      <div className="admit-card-stat">
                                        <span className="label">H</span>
                                        <span className="value" style={{ color: 'var(--clay)' }}>{mix.hard || 0}</span>
                                      </div>
                                    </>
                                  )}
                                  <div style={{
                                    marginLeft: 'auto',
                                    width: '28px', height: '28px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--ruby-subtle)',
                                    borderRadius: '50%',
                                    color: 'var(--ruby)',
                                    fontSize: '0.9rem',
                                  }}>→</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
