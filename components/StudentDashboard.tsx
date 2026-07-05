'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, FileText, BookOpen, Plus, Trash2, X, Zap, Lightbulb } from 'lucide-react';

interface SubjectCard {
  id: string; name: string;
  chapter_count: number; material_count: number; batch_count: number;
}
interface RecentAttempt {
  id: string; subject_name: string; chapter_name: string;
  batch_number: number; mode: string; percentage: number | null; submitted_at: string;
}
interface Stats { total_attempts: number; avg_score: number | null; best_score: number | null; }
interface Props {
  name: string; subjects: SubjectCard[]; stats: Stats;
  recentAttempts: RecentAttempt[]; isMentor: boolean;
}

function scoreColor(pct: number) {
  return pct >= 60 ? 'var(--sage)' : pct >= 40 ? '#888' : 'var(--ruby)';
}

async function deleteItem(type: string, id: string) {
  const res = await fetch(`/api/delete?type=${type}&id=${id}`, { method: 'DELETE' });
  return res.ok;
}

export default function StudentDashboard({ name, subjects: initialSubjects, stats, recentAttempts, isMentor }: Props) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalChapters = subjects.reduce((n, s) => n + s.chapter_count, 0);

  async function handleAddSubject() {
    if (!newSubjectName.trim()) return;
    setAdding(true);
    const res = await fetch('/api/subjects-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubjectName.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      setSubjects(prev => [...prev, { id: data.id, name: newSubjectName.trim(), chapter_count: 0, material_count: 0, batch_count: 0 }]);
      setNewSubjectName('');
      setShowAddSubject(false);
    }
    setAdding(false);
  }

  async function handleDeleteSubject(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this subject and all its chapters, tests and materials? This cannot be undone.')) return;
    setDeletingId(id);
    const ok = await deleteItem('subject', id);
    if (ok) setSubjects(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Greeting */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Welcome back,<br /><span style={{ color: 'var(--ruby)' }}>{name}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Subjects', value: subjects.length },
          { label: 'Chapters', value: totalChapters },
          { label: 'Attempts', value: stats.total_attempts },
          { label: 'Avg Score', value: stats.avg_score != null ? `${stats.avg_score.toFixed(1)}%` : '—', color: stats.avg_score != null ? scoreColor(stats.avg_score) : undefined },
        ].map(stat => (
          <div key={stat.label} style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)', background: 'var(--bg-3)', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: stat.color ?? 'var(--ink)', marginBottom: '0.3rem' }}>{stat.value}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream-dim)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Math Speed Drill Banner */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <div
          onClick={() => router.push('/student/math-game')}
          style={{
            border: 'var(--border-thick)',
            boxShadow: 'var(--shadow-hard)',
            background: 'var(--ruby)',
            padding: '1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            transition: 'all 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '8px 8px 0 0 #000'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = 'var(--shadow-hard)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Zap size={28} color="#FFF" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#FFF' }}>Math Speed Drill</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', textTransform: 'none', letterSpacing: 0, marginTop: '0.15rem' }}>60 seconds · Mental math · Streaks & bonus points</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Lightbulb size={13} /> Tricks
            </span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', color: '#FFF' }}>→</span>
          </div>
        </div>
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <div className="animate-up" style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'var(--cream-dim)' }}>Recent Attempts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {recentAttempts.map(a => (
              <div key={a.id} onClick={() => router.push(`/student/results/${a.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: 'var(--border-thick)', boxShadow: 'var(--shadow-btn)', background: 'var(--bg-3)', cursor: 'pointer', flexWrap: 'wrap', transition: 'background 100ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-3)')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.subject_name}<span style={{ color: 'var(--cream-dim)', fontWeight: 400 }}> › </span>{a.chapter_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: '0.15rem' }}>
                    Batch {a.batch_number} · {new Date(a.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                </div>
                <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', background: a.mode === 'exam' ? 'var(--ruby)' : '#000', color: '#FFF', textTransform: 'uppercase' }}>{a.mode}</span>
                {a.percentage != null && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: scoreColor(a.percentage) }}>{a.percentage.toFixed(1)}%</span>}
                <span style={{ fontSize: '0.85rem', color: 'var(--ruby)' }}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subjects */}
      <div className="animate-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream-dim)' }}>Subjects</div>
          {isMentor && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddSubject(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {showAddSubject ? <X size={14} /> : <Plus size={14} />}
              {showAddSubject ? 'Cancel' : 'New Subject'}
            </button>
          )}
        </div>

        {/* Add subject inline form */}
        {isMentor && showAddSubject && (
          <div className="animate-in" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              className="input"
              placeholder="Subject name, e.g. Indian Polity"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
              style={{ flex: 1 }}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleAddSubject} disabled={adding || !newSubjectName.trim()}>
              {adding ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Add'}
            </button>
          </div>
        )}

        {subjects.length === 0 ? (
          <div style={{ border: 'var(--border-thick)', background: 'var(--bg-3)', padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>
              {isMentor ? 'No subjects yet. Add one above.' : 'No subjects yet. Check back soon.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {subjects.map(s => (
              <div key={s.id} style={{ position: 'relative' }}>
                <div
                  onClick={() => router.push(`/student/subject/${s.id}`)}
                  style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)', background: 'var(--bg-3)', padding: '1.25rem', cursor: 'pointer', transition: 'all 100ms', paddingRight: isMentor ? '2.5rem' : '1.25rem' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage)'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000'; e.currentTarget.style.transform = 'translate(3px,3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.boxShadow = 'var(--shadow-hard)'; e.currentTarget.style.transform = 'translate(0,0)'; }}
                >
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', marginBottom: '0.85rem', lineHeight: 1.2 }}>{s.name}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', background: '#000', color: '#FFF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}><BookOpen size={10} /> {s.chapter_count}</span>
                    {s.material_count > 0 && <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', background: '#000', color: '#FFF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}><Map size={10} /> {s.material_count}</span>}
                    {s.batch_count > 0 && <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', background: 'var(--ruby)', color: '#FFF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}><FileText size={10} /> {s.batch_count}</span>}
                  </div>
                </div>
                {isMentor && (
                  <button
                    onClick={e => handleDeleteSubject(e, s.id)}
                    disabled={deletingId === s.id}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ruby)', padding: '2px', opacity: 0.6, display: 'flex' }}
                    title="Delete subject"
                  >
                    {deletingId === s.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
