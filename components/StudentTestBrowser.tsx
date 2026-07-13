'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, ChevronRight, Edit2, Check, X } from 'lucide-react';

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
  const [editingSubject, setEditingSubject] = useState<{ id: string, name: string } | null>(null);
  const [editingChapter, setEditingChapter] = useState<{ id: string, name: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const attemptedSet = new Set(attemptedBatchIds);

  async function handleSaveSubject(id: string, oldName: string) {
    if (!editingSubject || editingSubject.name.trim() === '' || editingSubject.name === oldName) {
      setEditingSubject(null);
      return;
    }
    await supabase.from('subjects').update({ name: editingSubject.name }).eq('id', id);
    setEditingSubject(null);
    startTransition(() => router.refresh());
  }

  async function handleSaveChapter(id: string, oldName: string) {
    if (!editingChapter || editingChapter.name.trim() === '' || editingChapter.name === oldName) {
      setEditingChapter(null);
      return;
    }
    await supabase.from('chapters').update({ name: editingChapter.name }).eq('id', id);
    setEditingChapter(null);
    startTransition(() => router.refresh());
  }

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
                    {editingSubject?.id === subject.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <input 
                          className="input" 
                          value={editingSubject.name} 
                          onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleSaveSubject(subject.id, subject.name)}
                          autoFocus
                          style={{ padding: '0.2rem 0.5rem', minHeight: 'auto', fontSize: '1.05rem', width: '200px', background: 'transparent', color: '#FFF' }}
                        />
                        <button className="btn btn-primary btn-sm" style={{ padding: '4px' }} onClick={() => handleSaveSubject(subject.id, subject.name)}><Check size={14}/></button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => setEditingSubject(null)}><X size={14}/></button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>
                          {subject.name}
                        </span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px', opacity: 0.6 }} onClick={(e) => { e.stopPropagation(); setEditingSubject({ id: subject.id, name: subject.name }); }}>
                          <Edit2 size={14}/>
                        </button>
                      </>
                    )}
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
                        {editingChapter?.id === chapter.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>
                            <input 
                              className="input" 
                              value={editingChapter.name} 
                              onChange={e => setEditingChapter({ ...editingChapter, name: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleSaveChapter(chapter.id, chapter.name)}
                              autoFocus
                              style={{ padding: '0.2rem 0.5rem', minHeight: 'auto', fontSize: '0.85rem', width: '250px' }}
                            />
                            <button className="btn btn-primary btn-sm" style={{ padding: '4px' }} onClick={() => handleSaveChapter(chapter.id, chapter.name)}><Check size={14}/></button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => setEditingChapter(null)}><X size={14}/></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream-dim)', letterSpacing: '0.01em' }}>
                              {chapter.name}
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px', opacity: 0.5, color: '#FFF' }} onClick={() => setEditingChapter({ id: chapter.id, name: chapter.name })}>
                              <Edit2 size={13}/>
                            </button>
                          </div>
                        )}
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
