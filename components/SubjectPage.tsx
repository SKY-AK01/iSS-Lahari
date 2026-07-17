'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, FileText, Plus, Trash2, X, Pencil, Check, ArrowRightLeft } from 'lucide-react';

interface ChapterCard {
  id: string; name: string;
  batch_count: number; material_count: number; attempt_count: number;
}
interface SubjectOption { id: string; name: string }
interface Props {
  subjectId: string; subjectName: string;
  chapters: ChapterCard[]; isMentor: boolean;
}

async function deleteItem(type: string, id: string) {
  const res = await fetch(`/api/delete?type=${type}&id=${id}`, { method: 'DELETE' });
  return res.ok;
}

async function renameItem(type: string, id: string, name: string) {
  const res = await fetch('/api/rename', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id, name }),
  });
  return res.ok;
}

export default function SubjectPage({ subjectId, subjectName: initialSubjectName, chapters: initial, isMentor }: Props) {
  const router = useRouter();
  const [chapters, setChapters] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Subject rename state
  const [subjectName, setSubjectName] = useState(initialSubjectName);
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState(initialSubjectName);
  const [savingSubject, setSavingSubject] = useState(false);

  // Chapter rename state
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState('');
  const [savingChapterId, setSavingChapterId] = useState<string | null>(null);

  // Chapter move state
  const [movingChapterId, setMovingChapterId] = useState<string | null>(null);
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function handleAddChapter() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch('/api/chapters-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, name: newName.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      setChapters(prev => [...prev, { id: data.id, name: newName.trim(), batch_count: 0, material_count: 0, attempt_count: 0 }]);
      setNewName('');
      setShowAdd(false);
    }
    setAdding(false);
  }

  async function handleDeleteChapter(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this chapter and all its tests and materials? This cannot be undone.')) return;
    setDeletingId(id);
    const ok = await deleteItem('chapter', id);
    if (ok) setChapters(prev => prev.filter(c => c.id !== id));
    setDeletingId(null);
  }

  async function handleSaveSubject() {
    if (!subjectDraft.trim() || subjectDraft.trim() === subjectName) { setEditingSubject(false); return; }
    setSavingSubject(true);
    const ok = await renameItem('subject', subjectId, subjectDraft.trim());
    if (ok) setSubjectName(subjectDraft.trim());
    setSavingSubject(false);
    setEditingSubject(false);
  }

  function startEditChapter(e: React.MouseEvent, chapter: ChapterCard) {
    e.stopPropagation();
    setEditingChapterId(chapter.id);
    setChapterDraft(chapter.name);
  }

  async function handleSaveChapter(e: React.MouseEvent, chapter: ChapterCard) {
    e.stopPropagation();
    if (!chapterDraft.trim() || chapterDraft.trim() === chapter.name) { setEditingChapterId(null); return; }
    setSavingChapterId(chapter.id);
    const ok = await renameItem('chapter', chapter.id, chapterDraft.trim());
    if (ok) setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, name: chapterDraft.trim() } : c));
    setSavingChapterId(null);
    setEditingChapterId(null);
  }

  async function openMovePanel(e: React.MouseEvent, chapterId: string) {
    e.stopPropagation();
    setMoveError(null);
    setMoveTargetId('');
    setMovingChapterId(chapterId);
    setLoadingSubjects(true);
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setAllSubjects(Array.isArray(data) ? data.filter((s: SubjectOption) => s.id !== subjectId) : []);
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function handleMoveChapter(e: React.MouseEvent, chapterId: string) {
    e.stopPropagation();
    if (!moveTargetId) return;
    setMovingId(chapterId);
    setMoveError(null);
    const res = await fetch('/api/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'chapter', id: chapterId, targetSubjectId: moveTargetId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMoveError(data.error ?? 'Move failed');
      setMovingId(null);
      return;
    }
    // Remove from current subject's list
    setChapters(prev => prev.filter(c => c.id !== chapterId));
    setMovingChapterId(null);
    setMovingId(null);
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student')} style={{ marginBottom: '1.25rem' }}>
        ← Dashboard
      </button>

      <div className="animate-up" style={{ marginBottom: '1.75rem' }}>
        {/* Subject name — editable for mentors */}
        {isMentor && editingSubject ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              className="input"
              value={subjectDraft}
              onChange={e => setSubjectDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveSubject(); if (e.key === 'Escape') setEditingSubject(false); }}
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', flex: 1, minWidth: '200px' }}
              autoFocus
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveSubject}
              disabled={savingSubject || !subjectDraft.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {savingSubject ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Check size={14} />}
              Save
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingSubject(false)}>
              <X size={14} /> Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {subjectName}
            </div>
            {isMentor && (
              <button
                onClick={() => { setSubjectDraft(subjectName); setEditingSubject(true); }}
                style={{ background: 'none', border: '2px solid transparent', cursor: 'pointer', color: 'var(--cream-dim)', padding: '4px', borderRadius: 0, display: 'flex', opacity: 0.5, transition: 'opacity 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                title="Rename subject"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cream-dim)', marginTop: '0.35rem' }}>
          {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Add chapter */}
      {isMentor && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAdd(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
            {showAdd ? 'Cancel' : 'New Chapter'}
          </button>
          {showAdd && (
            <div className="animate-in" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input
                className="input"
                placeholder="Chapter name, e.g. Historical Background"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddChapter()}
                style={{ flex: 1 }}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleAddChapter} disabled={adding || !newName.trim()}>
                {adding ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {chapters.length === 0 ? (
        <div style={{ border: 'var(--border-thick)', background: 'var(--bg-3)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>
            {isMentor ? 'No chapters yet. Add one above.' : 'No chapters yet.'}
          </div>
        </div>
      ) : (
        <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {chapters.map(chapter => (
            <div key={chapter.id} style={{ position: 'relative' }}>
              {/* Chapter rename mode */}
              {isMentor && editingChapterId === chapter.id ? (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'var(--border-thick)', background: 'var(--bg-3)', flexWrap: 'wrap' }}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    className="input"
                    value={chapterDraft}
                    onChange={e => setChapterDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveChapter(e as unknown as React.MouseEvent, chapter);
                      if (e.key === 'Escape') setEditingChapterId(null);
                    }}
                    style={{ flex: 1, fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', minWidth: '200px' }}
                    autoFocus
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => handleSaveChapter(e, chapter)}
                    disabled={savingChapterId === chapter.id || !chapterDraft.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {savingChapterId === chapter.id
                      ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      : <Check size={14} />}
                    Save
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={e => { e.stopPropagation(); setEditingChapterId(null); }}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              ) : movingChapterId === chapter.id ? (
                /* Move panel */
                <div
                  style={{ border: 'var(--border-thick)', background: 'var(--bg-3)', padding: '0.85rem 1rem' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', opacity: 0.6 }}>
                    Move <span style={{ color: 'var(--ruby)' }}>{chapter.name}</span> to subject:
                  </div>
                  {loadingSubjects ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', opacity: 0.5 }}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Loading subjects…
                    </div>
                  ) : allSubjects.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', opacity: 0.5 }}>No other subjects available.</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        className="input"
                        value={moveTargetId}
                        onChange={e => { setMoveTargetId(e.target.value); setMoveError(null); }}
                        style={{ flex: 1, minWidth: '180px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}
                      >
                        <option value="">Select subject…</option>
                        {allSubjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!moveTargetId || movingId === chapter.id}
                        onClick={e => handleMoveChapter(e, chapter.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      >
                        {movingId === chapter.id
                          ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          : <ArrowRightLeft size={13} />}
                        Move
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); setMovingChapterId(null); setMoveError(null); }}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  )}
                  {moveError && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--ruby)', fontFamily: 'var(--font-mono)' }}>
                      ⚠ {moveError}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => router.push(`/student/chapter/${chapter.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', paddingRight: isMentor ? '7rem' : '1.25rem', border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', background: 'var(--bg-3)', cursor: 'pointer', flexWrap: 'wrap', transition: 'all 100ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage)'; e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000'; e.currentTarget.style.transform = 'translate(2px,2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.boxShadow = 'var(--shadow-btn)'; e.currentTarget.style.transform = 'translate(0,0)'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.92rem', textTransform: 'uppercase', lineHeight: 1.2 }}>{chapter.name}</div>
                    {chapter.attempt_count > 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cream-dim)', marginTop: '0.2rem' }}>{chapter.attempt_count} attempt{chapter.attempt_count !== 1 ? 's' : ''}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    {chapter.material_count > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', background: '#000', color: '#FFF', textTransform: 'uppercase' }}><Map size={10} /> {chapter.material_count}</span>}
                    {chapter.batch_count > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', background: 'var(--ruby)', color: '#FFF', textTransform: 'uppercase' }}><FileText size={10} /> {chapter.batch_count}</span>}
                  </div>
                  <span style={{ color: 'var(--ruby)', fontSize: '0.9rem', flexShrink: 0 }}>→</span>
                </div>
              )}

              {/* Edit + Move + Delete buttons (shown only when not in rename/move mode) */}
              {isMentor && editingChapterId !== chapter.id && movingChapterId !== chapter.id && (
                <div style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    onClick={e => startEditChapter(e, chapter)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: '2px', opacity: 0.45, display: 'flex', transition: 'opacity 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
                    title="Rename chapter"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={e => openMovePanel(e, chapter.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: '2px', opacity: 0.45, display: 'flex', transition: 'opacity 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
                    title="Move to another subject"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                  <button
                    onClick={e => handleDeleteChapter(e, chapter.id)}
                    disabled={deletingId === chapter.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ruby)', padding: '2px', opacity: 0.55, display: 'flex', transition: 'opacity 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}
                    title="Delete chapter"
                  >
                    {deletingId === chapter.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Trash2 size={14} />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
