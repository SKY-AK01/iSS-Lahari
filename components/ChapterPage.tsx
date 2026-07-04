'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, FileText, BookOpen, Plus, Trash2 } from 'lucide-react';
import MindMapViewer from '@/components/MindMapViewer';
import { MindMapJSON } from '@/lib/types';

interface MaterialMeta { id: string; title: string; material_type: string; }
interface BatchAttempt { batch_id: string; percentage: number | null; mode: string; submitted_at: string; }
interface BatchCard { id: string; batch_number: number; question_count: number; difficulty_mix: Record<string, number> | null; attempts: BatchAttempt[]; }
interface Props {
  chapterId: string; chapterName: string; subjectId: string; subjectName: string;
  materials: MaterialMeta[]; batches: BatchCard[]; isMentor: boolean;
}

function scoreColor(pct: number) { return pct >= 60 ? 'var(--sage)' : pct >= 40 ? '#888' : 'var(--ruby)'; }
async function deleteItem(type: string, id: string) {
  const res = await fetch(`/api/delete?type=${type}&id=${id}`, { method: 'DELETE' });
  return res.ok;
}

export default function ChapterPage({ chapterId, chapterName, subjectId, subjectName, materials: initMaterials, batches: initBatches, isMentor }: Props) {
  const router = useRouter();
  const [materials, setMaterials] = useState(initMaterials);
  const [batches, setBatches] = useState(initBatches);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [materialContent, setMaterialContent] = useState<MindMapJSON | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function toggleMaterial(m: MaterialMeta) {
    if (activeMaterialId === m.id) { setActiveMaterialId(null); setMaterialContent(null); return; }
    setActiveMaterialId(m.id); setMaterialContent(null); setMaterialLoading(true);
    try {
      const res = await fetch(`/api/study-material?chapterId=${chapterId}`);
      const data = await res.json();
      const found = data.find((d: { id: string; content: MindMapJSON }) => d.id === m.id);
      setMaterialContent(found?.content ?? null);
    } catch { setMaterialContent(null); }
    finally { setMaterialLoading(false); }
  }

  async function handleDeleteMaterial(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this study material?')) return;
    setDeletingId(id);
    const ok = await deleteItem('study_material', id);
    if (ok) { setMaterials(prev => prev.filter(m => m.id !== id)); if (activeMaterialId === id) { setActiveMaterialId(null); setMaterialContent(null); } }
    setDeletingId(null);
  }

  async function handleDeleteBatch(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this test batch and all its questions and attempts?')) return;
    setDeletingId(id);
    const ok = await deleteItem('test_batch', id);
    if (ok) setBatches(prev => prev.filter(b => b.id !== id));
    setDeletingId(null);
  }

  const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: 'var(--cream-dim)' }}>
      {icon} {text}
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/student/subject/${subjectId}`)} style={{ marginBottom: '1.25rem' }}>
        ← {subjectName}
      </button>

      {/* Header */}
      <div className="animate-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cream-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {subjectName} › {chapterName}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {chapterName}
          </div>
        </div>
        {/* + button for mentor → goes to unified add page with pre-filled context */}
        {isMentor && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => router.push(`/mentor/add?subject=${encodeURIComponent(subjectName)}&chapter=${encodeURIComponent(chapterName)}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
          >
            <Plus size={14} /> Add Content
          </button>
        )}
      </div>

      {/* Study Materials */}
      {(materials.length > 0 || isMentor) && (
        <div className="animate-up" style={{ marginBottom: '2.5rem' }}>
          <SectionLabel icon={<Map size={12} />} text="Study Materials" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {materials.map(m => {
              const isActive = activeMaterialId === m.id;
              return (
                <div key={m.id}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <button
                      onClick={() => toggleMaterial(m)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, padding: '0.8rem 1rem', background: isActive ? '#000' : 'var(--bg-3)', border: 'var(--border-thick)', cursor: 'pointer', textAlign: 'left', color: isActive ? '#FFF' : 'var(--ink)', transition: 'all 100ms', boxShadow: isActive ? 'none' : 'var(--shadow-btn)', borderRight: isMentor ? 'none' : undefined }}
                    >
                      <span style={{ flexShrink: 0, opacity: 0.7 }}>{m.material_type === 'mind_map' ? <Map size={14} /> : <BookOpen size={14} />}</span>
                      <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.3, textTransform: 'none' }}>{m.title}</span>
                      <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 7px', background: isActive ? '#FFF' : '#000', color: isActive ? '#000' : '#FFF', textTransform: 'uppercase', flexShrink: 0 }}>{m.material_type === 'mind_map' ? 'MAP' : 'NOTE'}</span>
                      <span style={{ fontSize: '0.85rem', flexShrink: 0, opacity: 0.5 }}>{isActive ? '▲' : '▼'}</span>
                    </button>
                    {isMentor && (
                      <button
                        onClick={e => handleDeleteMaterial(e, m.id)}
                        disabled={deletingId === m.id}
                        style={{ padding: '0 0.75rem', background: 'var(--ruby)', border: 'var(--border-thick)', borderLeft: 'none', cursor: 'pointer', color: '#FFF', display: 'flex', alignItems: 'center', boxShadow: isActive ? 'none' : 'var(--shadow-btn)' }}
                        title="Delete"
                      >
                        {deletingId === m.id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                  {isActive && (
                    <div style={{ border: 'var(--border-thick)', borderTop: 'none', padding: '1.25rem', background: '#FFF', boxShadow: 'var(--shadow-hard)' }}>
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
            {materials.length === 0 && isMentor && (
              <div style={{ border: 'var(--border-thick)', padding: '1rem', textAlign: 'center', opacity: 0.4, fontFamily: 'var(--font-heading)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                No materials yet. Use Add Content above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Batches */}
      {(batches.length > 0 || isMentor) && (
        <div className="animate-up">
          <SectionLabel icon={<FileText size={12} />} text="Test Batches" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {batches.map(batch => {
              const mix = batch.difficulty_mix;
              const attemptCount = batch.attempts.length;
              const best = batch.attempts.filter(a => a.percentage != null).sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0];
              return (
                <div key={batch.id} style={{ flexBasis: '200px', flexGrow: 1, position: 'relative' }}>
                  <div
                    onClick={() => router.push(`/student/test/${batch.id}`)}
                    style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)', background: 'var(--bg-3)', cursor: 'pointer', transition: 'all 100ms', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage)'; e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000'; e.currentTarget.style.transform = 'translate(3px,3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.boxShadow = 'var(--shadow-hard)'; e.currentTarget.style.transform = 'translate(0,0)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem 0.6rem', borderBottom: '2px solid #000' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800 }}>Batch {batch.batch_number}</span>
                        {attemptCount > 0 && <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '1px 6px', background: '#000', color: 'var(--sage)', textTransform: 'uppercase' }}>{attemptCount}x</span>}
                      </div>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 900, padding: '2px 8px', border: '2px solid #000', textTransform: 'uppercase' }}>{batch.question_count} Qs</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem' }}>
                      {mix && ['easy', 'medium', 'hard'].map((d, i) => (
                        <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: i === 0 ? 'var(--sage)' : i === 2 ? 'var(--ruby)' : 'var(--ink)' }}>{mix[d] || 0}</span>
                          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>{d[0].toUpperCase()}</span>
                        </div>
                      ))}
                      <div style={{ marginLeft: 'auto' }}>
                        {best?.percentage != null
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: scoreColor(best.percentage) }}>{best.percentage.toFixed(1)}%</span>
                          : <span style={{ color: 'var(--ruby)', fontSize: '1rem', fontWeight: 900 }}>→</span>}
                      </div>
                    </div>
                  </div>
                  {isMentor && (
                    <button
                      onClick={e => handleDeleteBatch(e, batch.id)}
                      disabled={deletingId === batch.id}
                      style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'var(--ruby)', border: '2px solid #000', cursor: 'pointer', color: '#FFF', padding: '3px 5px', display: 'flex', alignItems: 'center' }}
                      title="Delete batch"
                    >
                      {deletingId === batch.id ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} /> : <Trash2 size={11} />}
                    </button>
                  )}
                </div>
              );
            })}
            {batches.length === 0 && isMentor && (
              <div style={{ border: 'var(--border-thick)', padding: '1rem', textAlign: 'center', opacity: 0.4, fontFamily: 'var(--font-heading)', fontSize: '0.78rem', textTransform: 'uppercase', width: '100%' }}>
                No test batches yet. Use Add Content above.
              </div>
            )}
          </div>
        </div>
      )}

      {materials.length === 0 && batches.length === 0 && !isMentor && (
        <div style={{ border: 'var(--border-thick)', background: 'var(--bg-3)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.4 }}>Nothing added yet.</div>
        </div>
      )}
    </div>
  );
}
