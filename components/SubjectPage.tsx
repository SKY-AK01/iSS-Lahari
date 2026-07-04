'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, FileText, Plus, Trash2, X } from 'lucide-react';

interface ChapterCard {
  id: string; name: string;
  batch_count: number; material_count: number; attempt_count: number;
}
interface Props {
  subjectId: string; subjectName: string;
  chapters: ChapterCard[]; isMentor: boolean;
}

async function deleteItem(type: string, id: string) {
  const res = await fetch(`/api/delete?type=${type}&id=${id}`, { method: 'DELETE' });
  return res.ok;
}

export default function SubjectPage({ subjectId, subjectName, chapters: initial, isMentor }: Props) {
  const router = useRouter();
  const [chapters, setChapters] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student')} style={{ marginBottom: '1.25rem' }}>
        ← Dashboard
      </button>

      <div className="animate-up" style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {subjectName}
        </div>
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
              <div
                onClick={() => router.push(`/student/chapter/${chapter.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', paddingRight: isMentor ? '3rem' : '1.25rem', border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', background: 'var(--bg-3)', cursor: 'pointer', flexWrap: 'wrap', transition: 'all 100ms' }}
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
              {isMentor && (
                <button
                  onClick={e => handleDeleteChapter(e, chapter.id)}
                  disabled={deletingId === chapter.id}
                  style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ruby)', padding: '2px', opacity: 0.6, display: 'flex' }}
                  title="Delete chapter"
                >
                  {deletingId === chapter.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Trash2 size={14} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
