'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Map, BookOpen, FileText } from 'lucide-react';
import MindMapViewer from '@/components/MindMapViewer';
import { MindMapJSON } from '@/lib/types';

interface StudyMaterialMeta {
  id: string;
  title: string;
  material_type: string;
  created_at: string;
}

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
  study_materials: StudyMaterialMeta[];
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

export default function SubjectHub({ subjects, attemptedBatchIds }: Props) {
  const [search, setSearch] = useState('');
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(
    new Set(subjects.map(s => s.id))
  );
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  // Study material viewer state
  const [activeMaterial, setActiveMaterial] = useState<{ id: string; chapterId: string; title: string } | null>(null);
  const [materialContent, setMaterialContent] = useState<MindMapJSON | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);

  const router = useRouter();
  const attemptedSet = new Set(attemptedBatchIds);

  function toggleSubject(id: string) {
    setOpenSubjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleChapter(id: string) {
    setOpenChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function openMaterial(m: StudyMaterialMeta, chapterId: string) {
    if (activeMaterial?.id === m.id) {
      setActiveMaterial(null);
      setMaterialContent(null);
      return;
    }
    setActiveMaterial({ id: m.id, chapterId, title: m.title });
    setMaterialContent(null);
    setMaterialLoading(true);
    try {
      const res = await fetch(`/api/study-material?chapterId=${chapterId}`);
      const data = await res.json();
      const found = data.find((d: { id: string; content: MindMapJSON }) => d.id === m.id);
      setMaterialContent(found?.content ?? null);
    } catch {
      setMaterialContent(null);
    } finally {
      setMaterialLoading(false);
    }
  }

  // Search filter
  const filteredSubjects = subjects.filter(s =>
    !search.trim() ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.chapters.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary counts
  const totalChapters = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const totalBatches = subjects.reduce((n, s) =>
    n + s.chapters.reduce((m, c) => m + c.test_batches.length, 0), 0);
  const totalMaterials = subjects.reduce((n, s) =>
    n + s.chapters.reduce((m, c) => m + c.study_materials.length, 0), 0);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '1.5rem' }}>
        <h1>Learn</h1>
        <p style={{ marginTop: '0.4rem' }}>
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''} ·{' '}
          {totalChapters} chapter{totalChapters !== 1 ? 's' : ''} ·{' '}
          {totalMaterials} study material{totalMaterials !== 1 ? 's' : ''} ·{' '}
          {totalBatches} test batch{totalBatches !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="search-box animate-up" style={{ marginBottom: '1.5rem', maxWidth: '360px' }}>
        <span className="search-icon"><Search size={16} /></span>
        <input
          className="input"
          placeholder="Search subjects or chapters…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
        />
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          {search ? 'No results found.' : 'Nothing added yet. Check back soon!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredSubjects.map(subject => {
            const isSubjectOpen = openSubjects.has(subject.id);
            const subjectBatches = subject.chapters.reduce((n, c) => n + c.test_batches.length, 0);
            const subjectMaterials = subject.chapters.reduce((n, c) => n + c.study_materials.length, 0);

            return (
              <div key={subject.id} className="animate-up">

                {/* ── Subject Header ─────────────────────────── */}
                <div
                  className={`collapsible-header ${isSubjectOpen ? 'open' : ''}`}
                  onClick={() => toggleSubject(subject.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem' }}>
                      {subject.name}
                    </span>
                    <span className="batch-badge">{subject.chapters.length} chapter{subject.chapters.length !== 1 ? 's' : ''}</span>
                    {subjectMaterials > 0 && (
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
                        {subjectMaterials} material{subjectMaterials !== 1 ? 's' : ''}
                      </span>
                    )}
                    {subjectBatches > 0 && (
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
                        {subjectBatches} test{subjectBatches !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <span className={`chevron ${isSubjectOpen ? 'open' : ''}`} style={{ display: 'flex' }}>
                    <ChevronRight size={18} />
                  </span>
                </div>

                {/* ── Chapters ───────────────────────────────── */}
                {isSubjectOpen && (
                  <div className="collapsible-body" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {subject.chapters.map(chapter => {
                      const isChapterOpen = openChapters.has(chapter.id);
                      const hasMaterials = chapter.study_materials.length > 0;
                      const hasBatches = chapter.test_batches.length > 0;

                      return (
                        <div key={chapter.id} style={{ border: 'var(--border-thick)', background: 'var(--bg)' }}>

                          {/* Chapter row */}
                          <div
                            onClick={() => toggleChapter(chapter.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.9rem 1rem',
                              cursor: 'pointer',
                              borderBottom: isChapterOpen ? 'var(--border-thick)' : 'none',
                              background: isChapterOpen ? 'var(--sage)' : 'var(--bg-3)',
                              transition: 'background 100ms',
                              userSelect: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                              <span style={{
                                fontFamily: 'var(--font-heading)',
                                fontWeight: 900,
                                fontSize: '0.88rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.01em',
                                color: 'var(--ink)',
                              }}>
                                {chapter.name}
                              </span>
                              {/* Pills showing what's inside */}
                              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                {hasMaterials && (
                                  <span style={{
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                    padding: '2px 7px', background: '#000', color: '#FFF',
                                    textTransform: 'uppercase',
                                  }}>
                                    <Map size={10} /> {chapter.study_materials.length}
                                  </span>
                                )}
                                {hasBatches && (
                                  <span style={{
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                    padding: '2px 7px', background: 'var(--ruby)', color: '#FFF',
                                    textTransform: 'uppercase',
                                  }}>
                                    <FileText size={10} /> {chapter.test_batches.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`chevron ${isChapterOpen ? 'open' : ''}`} style={{ display: 'flex', flexShrink: 0 }}>
                              <ChevronRight size={16} />
                            </span>
                          </div>

                          {/* Chapter content */}
                          {isChapterOpen && (
                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                              {/* Study Materials section */}
                              {hasMaterials && (
                                <div>
                                  <div style={{
                                    fontSize: '0.7rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    marginBottom: '0.6rem', color: 'var(--cream-dim)',
                                  }}>
                                    <Map size={12} /> Study Materials
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {chapter.study_materials.map(m => {
                                      const isActive = activeMaterial?.id === m.id;
                                      return (
                                        <div key={m.id}>
                                          <button
                                            onClick={() => openMaterial(m, chapter.id)}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.6rem',
                                              width: '100%',
                                              padding: '0.7rem 1rem',
                                              background: isActive ? '#000' : 'var(--bg-3)',
                                              border: 'var(--border-thick)',
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              color: isActive ? '#FFF' : 'var(--ink)',
                                              transition: 'all 100ms',
                                              boxShadow: isActive ? 'none' : 'var(--shadow-btn)',
                                            }}
                                          >
                                            <span style={{ flexShrink: 0, opacity: 0.7 }}>
                                              {m.material_type === 'mind_map' ? <Map size={14} /> : <BookOpen size={14} />}
                                            </span>
                                            <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.3, textTransform: 'none' }}>
                                              {m.title}
                                            </span>
                                            <span style={{
                                              fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                              padding: '2px 6px',
                                              background: isActive ? '#FFF' : '#000',
                                              color: isActive ? '#000' : '#FFF',
                                              textTransform: 'uppercase', flexShrink: 0,
                                            }}>
                                              {m.material_type === 'mind_map' ? 'MAP' : 'NOTE'}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', flexShrink: 0, opacity: 0.5 }}>
                                              {isActive ? '▲' : '▼'}
                                            </span>
                                          </button>

                                          {/* Inline viewer — expands below the button */}
                                          {isActive && (
                                            <div className="animate-in" style={{ border: 'var(--border-thick)', borderTop: 'none', padding: '1.25rem', background: '#FFF', boxShadow: 'var(--shadow-hard)' }}>
                                              {materialLoading ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', justifyContent: 'center' }}>
                                                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
                                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>Loading…</span>
                                                </div>
                                              ) : materialContent ? (
                                                <MindMapViewer material={materialContent} />
                                              ) : (
                                                <div className="alert alert-error">Failed to load content.</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Test Batches section */}
                              {hasBatches && (
                                <div>
                                  <div style={{
                                    fontSize: '0.7rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    marginBottom: '0.6rem', color: 'var(--cream-dim)',
                                  }}>
                                    <FileText size={12} /> Test Batches
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                    {chapter.test_batches.map(batch => {
                                      const done = attemptedSet.has(batch.id);
                                      const mix = batch.difficulty_mix;
                                      return (
                                        <div
                                          key={batch.id}
                                          className="admit-card"
                                          style={{ flexBasis: '180px', flexGrow: 1 }}
                                          onClick={() => router.push(`/student/test/${batch.id}`)}
                                        >
                                          <div className="admit-card-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                                                Batch {batch.batch_number}
                                              </span>
                                              {done && (
                                                <span style={{
                                                  fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                                                  padding: '1px 6px', background: '#000', color: 'var(--sage)',
                                                  textTransform: 'uppercase',
                                                }}>
                                                  Done
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
                                                  <span className="value">{mix.medium || 0}</span>
                                                </div>
                                                <div className="admit-card-stat">
                                                  <span className="label">H</span>
                                                  <span className="value" style={{ color: 'var(--ruby)' }}>{mix.hard || 0}</span>
                                                </div>
                                              </>
                                            )}
                                            <div style={{ marginLeft: 'auto', color: 'var(--ruby)', fontSize: '1rem', fontWeight: 900 }}>→</div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {!hasMaterials && !hasBatches && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', opacity: 0.5, fontFamily: 'var(--font-mono)', padding: '0.5rem 0' }}>
                                  Nothing added yet for this chapter.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
