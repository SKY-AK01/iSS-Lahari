'use client';

import { useState, useEffect } from 'react';
import { Search, Map, BookOpen } from 'lucide-react';
import MindMapViewer from '@/components/MindMapViewer';
import { MindMapJSON } from '@/lib/types';

interface MaterialMeta {
  id: string;
  title: string;
  material_type: string;
  created_at: string;
  chapter: {
    id: string;
    name: string;
    subject: {
      id: string;
      name: string;
    };
  };
}

interface Props {
  materials: MaterialMeta[];
}

// Group materials by subject → chapter
function groupMaterials(materials: MaterialMeta[]) {
  const map: Record<string, { subjectName: string; chapters: Record<string, { chapterName: string; items: MaterialMeta[] }> }> = {};
  for (const m of materials) {
    const sid = m.chapter.subject.id;
    const cid = m.chapter.id;
    if (!map[sid]) map[sid] = { subjectName: m.chapter.subject.name, chapters: {} };
    if (!map[sid].chapters[cid]) map[sid].chapters[cid] = { chapterName: m.chapter.name, items: [] };
    map[sid].chapters[cid].items.push(m);
  }
  return map;
}

export default function StudyBrowserClient({ materials }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MaterialMeta | null>(null);
  const [loadedContent, setLoadedContent] = useState<MindMapJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());

  // Auto-open all subjects on load
  useEffect(() => {
    const grouped = groupMaterials(materials);
    setOpenSubjects(new Set(Object.keys(grouped)));
  }, [materials]);

  async function loadMaterial(m: MaterialMeta) {
    if (selected?.id === m.id) return;
    setSelected(m);
    setLoadedContent(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/study-material?chapterId=${m.chapter.id}`);
      const data = await res.json();
      const found = data.find((d: { id: string; content: MindMapJSON }) => d.id === m.id);
      setLoadedContent(found?.content ?? null);
    } catch {
      setLoadedContent(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleSubject(id: string) {
    setOpenSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = groupMaterials(materials);

  // Filter by search
  const filteredGrouped: typeof grouped = {};
  for (const [sid, subj] of Object.entries(grouped)) {
    const filteredChapters: (typeof subj)['chapters'] = {};
    for (const [cid, chap] of Object.entries(subj.chapters)) {
      const filteredItems = chap.items.filter(m =>
        !search.trim() ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        chap.chapterName.toLowerCase().includes(search.toLowerCase()) ||
        subj.subjectName.toLowerCase().includes(search.toLowerCase())
      );
      if (filteredItems.length > 0) filteredChapters[cid] = { ...chap, items: filteredItems };
    }
    if (Object.keys(filteredChapters).length > 0) {
      filteredGrouped[sid] = { ...subj, chapters: filteredChapters };
    }
  }

  const totalMaterials = materials.length;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <h1>Study Materials</h1>
        <p style={{ marginTop: '0.4rem' }}>
          {totalMaterials} material{totalMaterials !== 1 ? 's' : ''} — mind-maps, timelines & notes
        </p>
      </div>

      {totalMaterials === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
          No study materials available yet. Check back soon!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Sidebar / Browser */}
          <div>
            {/* Search */}
            <div className="search-box animate-up" style={{ marginBottom: '1rem' }}>
              <span className="search-icon"><Search size={16} /></span>
              <input
                className="input"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem', fontSize: '0.88rem', padding: '0.55rem 1rem 0.55rem 2.5rem' }}
              />
            </div>

            {Object.keys(filteredGrouped).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                No results.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(filteredGrouped).map(([sid, subj]) => {
                  const isOpen = openSubjects.has(sid);
                  return (
                    <div key={sid} className="animate-up">
                      {/* Subject header */}
                      <div
                        className={`collapsible-header ${isOpen ? 'open' : ''}`}
                        onClick={() => toggleSubject(sid)}
                        style={{ padding: '0.9rem 1rem' }}
                      >
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                          {subj.subjectName}
                        </span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>

                      {isOpen && (
                        <div style={{ border: 'var(--border-thick)', borderTop: 'none', background: '#FFF', padding: '0.5rem' }}>
                          {Object.entries(subj.chapters).map(([cid, chap]) => (
                            <div key={cid} style={{ marginBottom: '0.5rem' }}>
                              {/* Chapter label */}
                              <div style={{
                                fontSize: '0.72rem',
                                fontFamily: 'var(--font-heading)',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: 'var(--cream-dim)',
                                padding: '0.4rem 0.5rem',
                                borderLeft: '4px solid #000',
                                marginBottom: '0.3rem',
                              }}>
                                {chap.chapterName}
                              </div>
                              {/* Material items */}
                              {chap.items.map(m => {
                                const isActive = selected?.id === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => loadMaterial(m)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      width: '100%',
                                      padding: '0.6rem 0.75rem',
                                      background: isActive ? 'var(--sage)' : 'transparent',
                                      border: isActive ? 'var(--border-thick)' : '2px solid transparent',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      fontFamily: 'var(--font-body)',
                                      fontSize: '0.84rem',
                                      fontWeight: isActive ? 700 : 500,
                                      color: 'var(--ink)',
                                      transition: 'all 100ms',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    <span style={{ flexShrink: 0, opacity: 0.6 }}>
                                      {m.material_type === 'mind_map' ? <Map size={14} /> : <BookOpen size={14} />}
                                    </span>
                                    <span style={{ flex: 1, lineHeight: 1.3 }}>{m.title}</span>
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontFamily: 'var(--font-heading)',
                                      fontWeight: 900,
                                      padding: '2px 6px',
                                      background: '#000',
                                      color: '#FFF',
                                      flexShrink: 0,
                                      textTransform: 'uppercase',
                                    }}>
                                      {m.material_type === 'mind_map' ? 'MAP' : 'NOTE'}
                                    </span>
                                  </button>
                                );
                              })}
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

          {/* Content Panel */}
          {selected && (
            <div className="animate-in">
              {/* Material header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.3rem' }}>
                    {selected.chapter.subject.name} › {selected.chapter.name}
                  </div>
                  <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>{selected.title}</h2>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSelected(null); setLoadedContent(null); }}
                >
                  ✕ Close
                </button>
              </div>

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '3rem', justifyContent: 'center' }}>
                  <span className="spinner" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>Loading…</span>
                </div>
              ) : loadedContent ? (
                <MindMapViewer material={loadedContent} />
              ) : (
                <div className="alert alert-error">Failed to load material content.</div>
              )}
            </div>
          )}

          {/* Empty state when nothing selected but sidebar is in column mode */}
          {!selected && (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
