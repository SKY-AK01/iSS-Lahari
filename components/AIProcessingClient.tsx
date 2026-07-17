'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MindMapJSON } from '@/lib/types';
import {
  CheckCircle2, Loader2, AlertCircle, Clock, Zap,
  RefreshCw, ExternalLink, BarChart3, Key, Layers, Play, ListChecks,
} from 'lucide-react';

const CHUNK_SIZE_ESTIMATE = 12; // must match the actual CHUNK_SIZE in process/route.ts

// ── Types ─────────────────────────────────────────────────────────────────────
interface MaterialRow {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  createdAt: string;
  recordCount: number;          // total records in the mind map
  status: 'pending' | 'processing' | 'partial' | 'done' | null;
  totalChunks: number;          // 0 if processing hasn't started yet
  doneChunks: number;
  failedChunks: number;
  relationsCount: number;
  lastUpdated: string | null;
  keyUsage: Record<string, number>;
}

interface Props {
  initialRows: MaterialRow[];
}

// ── Status config ─────────────────────────────────────────────────────────────
function statusConfig(status: MaterialRow['status']) {
  switch (status) {
    case 'done':
      return { label: 'Done', icon: <CheckCircle2 size={13} />, bg: '#C6F6D5', color: '#276749', border: '#276749' };
    case 'processing':
      return { label: 'Processing', icon: <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />, bg: '#BEE3F8', color: '#2B6CB0', border: '#2B6CB0' };
    case 'partial':
      return { label: 'Partial / Resuming', icon: <AlertCircle size={13} />, bg: '#FEEBC8', color: '#C05621', border: '#C05621' };
    case 'pending':
      return { label: 'Pending', icon: <Clock size={13} />, bg: '#E9D8FD', color: '#6B46C1', border: '#6B46C1' };
    default:
      return { label: 'Queued', icon: <Zap size={13} />, bg: '#F0F0F0', color: '#555', border: '#999' };
  }
}

// ── Summary bar data ──────────────────────────────────────────────────────────
function buildSummary(rows: MaterialRow[]) {
  return {
    total:      rows.length,
    done:       rows.filter(r => r.status === 'done').length,
    processing: rows.filter(r => r.status === 'processing').length,
    partial:    rows.filter(r => r.status === 'partial').length,
    pending:    rows.filter(r => r.status === 'pending' || r.status === null).length,
    relations:  rows.reduce((n, r) => n + r.relationsCount, 0),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIProcessingClient({ initialRows }: Props) {
  const supabase = createClient();
  const [rows, setRows]         = useState<MaterialRow[]>(initialRows);
  const [lastPoll, setLastPoll] = useState<Date>(new Date());
  const [polling, setPolling]   = useState(false);
  const [filter, setFilter]     = useState<'all' | 'done' | 'processing' | 'partial' | 'pending'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Per-material button loading state: materialId → 'preparing' | 'starting' | null
  const [btnLoading, setBtnLoading] = useState<Record<string, 'preparing' | 'starting' | null>>({});

  // ── Poll DB for latest statuses ───────────────────────────────────────────
  const poll = useCallback(async () => {
    setPolling(true);
    const { data } = await supabase
      .from('study_materials')
      .select('id, title, created_at, content, chapter:chapters(id, name, subject:subjects(id, name))')
      .eq('material_type', 'mind_map')
      .order('created_at', { ascending: false });

    if (data) {
      const updated: MaterialRow[] = data.map((m) => {
        const content = m.content as unknown as MindMapJSON;
        const ai = content?.ai_processing;
        const recordCount  = content?.records?.length ?? 0;
        const totalChunks  = ai?.totalChunks ?? 0;
        const doneChunks   = ai?.chunks?.filter(c => c.status === 'done').length ?? 0;
        const failedChunks = ai?.chunks?.filter(c => c.status === 'failed').length ?? 0;
        const relationsCount = content?.relations?.length ?? 0;
        const keyUsage: Record<string, number> = {};
        for (const chunk of (ai?.chunks ?? [])) {
          if (chunk.keyLabel && chunk.status === 'done') {
            keyUsage[chunk.keyLabel] = (keyUsage[chunk.keyLabel] ?? 0) + 1;
          }
        }
        return {
          id: m.id,
          title: m.title,
          subject: (m.chapter as any)?.subject?.name ?? '—',
          chapter: (m.chapter as any)?.name ?? '—',
          createdAt: m.created_at,
          recordCount,
          status: ai?.status ?? null,
          totalChunks,
          doneChunks,
          failedChunks,
          relationsCount,
          lastUpdated: ai?.lastUpdated ?? null,
          keyUsage,
        };
      });
      setRows(updated);
    }
    setLastPoll(new Date());
    setPolling(false);
  }, [supabase]);

  // ── Auto-sweep + poll on mount; poll every 20s ────────────────────────────
  useEffect(() => {
    fetch('/api/mind-map/sweep').catch(() => {});
    poll();
    const id = setInterval(poll, 20_000);
    return () => clearInterval(id);
  }, [poll]);

  // ── Prepare: divide into chunks, no AI yet ────────────────────────────────
  async function handlePrepare(materialId: string) {
    setBtnLoading(prev => ({ ...prev, [materialId]: 'preparing' }));
    try {
      await fetch('/api/mind-map/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      });
      await poll(); // refresh to show chunks
      // Auto-expand to show the chunk plan
      setExpanded(prev => { const n = new Set(prev); n.add(materialId); return n; });
    } finally {
      setBtnLoading(prev => ({ ...prev, [materialId]: null }));
    }
  }

  // ── Start: fire AI processing, returns immediately ────────────────────────
  async function handleStart(materialId: string) {
    setBtnLoading(prev => ({ ...prev, [materialId]: 'starting' }));
    try {
      await fetch('/api/mind-map/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      });
      await poll(); // show processing status
    } finally {
      setBtnLoading(prev => ({ ...prev, [materialId]: null }));
    }
  }

  const summary  = buildSummary(rows);
  const filtered = rows.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending' || r.status === null;
    return r.status === filter;
  });

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* ── Header ── */}
      <div className="animate-up" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', marginBottom: '0.3rem' }}>
              AI Processing
            </h1>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Mind map relation generation — live status for all materials
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#888' }}>
              Last polled {lastPoll.toLocaleTimeString()}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={poll}
              disabled={polling}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={13} style={{ animation: polling ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <a href="/mentor" className="btn btn-ghost btn-sm">← Dashboard</a>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div
        className="animate-up stagger"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}
      >
        {[
          { label: 'Total Maps',   value: summary.total,      icon: <Layers size={20} />,      bg: '#FFF' },
          { label: 'Done',         value: summary.done,       icon: <CheckCircle2 size={20} />, bg: '#C6F6D5', color: '#276749' },
          { label: 'Processing',   value: summary.processing, icon: <Loader2 size={20} />,      bg: '#BEE3F8', color: '#2B6CB0' },
          { label: 'Partial',      value: summary.partial,    icon: <AlertCircle size={20} />,  bg: '#FEEBC8', color: '#C05621' },
          { label: 'Queued',       value: summary.pending,    icon: <Clock size={20} />,        bg: '#E9D8FD', color: '#6B46C1' },
          { label: 'Relations',    value: summary.relations,  icon: <BarChart3 size={20} />,    bg: '#FFF0F8', color: '#D53F8C' },
        ].map((s, i) => (
          <div
            key={i}
            className="card animate-up"
            style={{ textAlign: 'center', padding: '1.1rem 0.75rem', background: s.bg ?? '#FFF', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem', color: s.color ?? 'var(--ink)' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 800, color: s.color ?? 'var(--ruby)' }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', color: s.color ?? 'var(--cream-dim)', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar (done / total) ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            Overall Progress
          </span>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#276749' }}>
            {summary.done} / {summary.total} done
          </span>
        </div>
        <div style={{ height: '14px', background: '#EEE', border: '3px solid #000', boxShadow: '3px 3px 0 #000', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: summary.total > 0 ? `${Math.round((summary.done / summary.total) * 100)}%` : '0%',
              background: summary.done === summary.total && summary.total > 0 ? '#276749' : 'var(--ruby)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['all', 'done', 'processing', 'partial', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn btn-sm"
            style={{
              background: filter === f ? '#000' : '#FFF',
              color: filter === f ? '#FFF' : '#000',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              letterSpacing: '0.05em',
            }}
          >
            {f === 'all' ? `All (${summary.total})` :
             f === 'done' ? `Done (${summary.done})` :
             f === 'processing' ? `Processing (${summary.processing})` :
             f === 'partial' ? `Partial (${summary.partial})` :
             `Queued (${summary.pending})`}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          No materials in this filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map((row) => {
            const sc        = statusConfig(row.status);
            const isExpanded = expanded.has(row.id);
            const progress  = row.totalChunks > 0
              ? Math.round((row.doneChunks / row.totalChunks) * 100)
              : row.status === 'done' ? 100 : 0;

            return (
              <div
                key={row.id}
                style={{ border: '3px solid #000', boxShadow: '4px 4px 0 #000', background: '#FFF', overflow: 'hidden' }}
              >
                {/* Row header */}
                <div
                  onClick={() => toggleExpand(row.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    alignItems: 'center',
                    background: isExpanded ? '#F9F9F9' : '#FFF',
                    borderBottom: isExpanded ? '2px solid #EEE' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Status badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px',
                      background: sc.bg, color: sc.color,
                      border: `2px solid ${sc.border}`,
                      fontFamily: 'var(--font-heading)', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      {sc.icon} {sc.label}
                    </span>

                    {/* Title + breadcrumb */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#000', lineHeight: 1.2 }}>
                        {row.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#666', fontFamily: 'var(--font-mono)', marginTop: '1px' }}>
                        {row.subject} → {row.chapter}
                      </div>
                    </div>

                    {/* Chunk progress — always shown, estimated if not started */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {row.totalChunks > 0 ? (
                        // Processing has started — real data
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#333' }}>
                          <span style={{ color: '#276749' }}>{row.doneChunks}</span>
                          {' done · '}
                          <span style={{ color: '#888' }}>{row.totalChunks - row.doneChunks - row.failedChunks} remaining</span>
                          {' · '}
                          <span style={{ color: '#555' }}>{row.totalChunks} total</span>
                          {row.failedChunks > 0 && (
                            <span style={{ color: '#C05621', marginLeft: '0.3rem' }}>· {row.failedChunks} failed</span>
                          )}
                        </span>
                      ) : (
                        // Not started yet — show estimate from record count
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#888' }}>
                          <span style={{ color: '#6B46C1' }}>
                            ~{Math.ceil(row.recordCount / CHUNK_SIZE_ESTIMATE)} chunks
                          </span>
                          {' estimated · '}
                          <span>{row.recordCount} records</span>
                          {' · not started'}
                        </span>
                      )}
                      {row.relationsCount > 0 && (
                        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#D53F8C' }}>
                          {row.relationsCount} AI relations found
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: progress bar + action buttons + graph link */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {/* Progress bar — real if started, 0% if not */}
                    <div style={{ width: 90 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#888' }}>
                          {row.totalChunks > 0 ? `${row.doneChunks}/${row.totalChunks}` : `0/~${Math.ceil(row.recordCount / CHUNK_SIZE_ESTIMATE)}`}
                        </span>
                        <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: progress > 0 ? '#276749' : '#888' }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{ height: '8px', background: '#EEE', border: '2px solid #000', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: row.status === 'done' ? '#276749' : row.failedChunks > 0 ? '#C05621' : '#D81B60',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>

                    {/* Action buttons — context-sensitive */}
                    {row.status === 'done' ? (
                      // Done — no action
                      <span style={{ fontSize: '0.65rem', color: '#276749', fontWeight: 700, fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>
                        ✓ Done
                      </span>
                    ) : row.status === 'processing' ? (
                      // Running — show spinner
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: '#2B6CB0', fontWeight: 700, fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running…
                      </span>
                    ) : row.totalChunks > 0 ? (
                      // Chunks prepared, not yet started (or partial resume)
                      <button
                        onClick={e => { e.stopPropagation(); handleStart(row.id); }}
                        disabled={btnLoading[row.id] === 'starting'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px',
                          background: '#000', color: '#FFF', border: '2px solid #000',
                          cursor: 'pointer', fontFamily: 'var(--font-heading)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          opacity: btnLoading[row.id] === 'starting' ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {btnLoading[row.id] === 'starting'
                          ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</>
                          : <><Play size={11} /> {row.status === 'partial' ? 'Resume' : 'Start AI'}</>
                        }
                      </button>
                    ) : (
                      // No chunks yet — show Prepare button
                      <button
                        onClick={e => { e.stopPropagation(); handlePrepare(row.id); }}
                        disabled={btnLoading[row.id] === 'preparing'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px',
                          background: '#6B46C1', color: '#FFF', border: '2px solid #6B46C1',
                          cursor: 'pointer', fontFamily: 'var(--font-heading)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          opacity: btnLoading[row.id] === 'preparing' ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {btnLoading[row.id] === 'preparing'
                          ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Preparing…</>
                          : <><ListChecks size={11} /> Prepare</>
                        }
                      </button>
                    )}

                    <a
                      href={`/graph/${row.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="View graph"
                      style={{ color: '#000', display: 'flex', padding: '4px' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#999', userSelect: 'none' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '1rem', background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '2px' }}>Uploaded</div>
                        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {row.lastUpdated && (
                        <div>
                          <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '2px' }}>Last AI update</div>
                          <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {new Date(row.lastUpdated).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '2px' }}>Relations found</div>
                        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#D53F8C' }}>
                          {row.relationsCount}
                        </div>
                      </div>
                    </div>

                    {/* Key usage */}
                    {Object.keys(row.keyUsage).length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Key size={10} /> API Keys Used
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {Object.entries(row.keyUsage).map(([key, count]) => {
                            const isMistral = key.startsWith('mistral');
                            return (
                              <span key={key} style={{
                                fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                                padding: '2px 8px',
                                background: isMistral ? '#EBF8FF' : '#FFF0F8',
                                color: isMistral ? '#2B6CB0' : '#D53F8C',
                                border: `2px solid ${isMistral ? '#2B6CB0' : '#D53F8C'}`,
                              }}>
                                {key} × {count}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Chunk grid */}
                    {row.totalChunks > 0 && (
                      <div>
                        <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: '0.5rem' }}>
                          Chunk Map ({row.totalChunks} total)
                        </div>
                        <ChunkGrid materialId={row.id} />
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
}

// ── Chunk grid — fetches chunk-level detail on expand ─────────────────────────
function ChunkGrid({ materialId }: { materialId: string }) {
  const supabase = createClient();
  const [chunks, setChunks] = useState<any[] | null>(null);

  useEffect(() => {
    supabase
      .from('study_materials')
      .select('content')
      .eq('id', materialId)
      .single()
      .then(({ data }) => {
        const content = data?.content as unknown as MindMapJSON;
        setChunks(content?.ai_processing?.chunks ?? []);
      });
  }, [materialId, supabase]);

  if (!chunks) {
    return <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'var(--font-mono)' }}>Loading chunks…</div>;
  }
  if (chunks.length === 0) {
    return <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'var(--font-mono)' }}>No chunk data yet.</div>;
  }

  const chunkColors: Record<string, string> = {
    done:       '#276749',
    failed:     '#C05621',
    processing: '#2B6CB0',
    pending:    '#6B46C1',
  };
  const chunkBgs: Record<string, string> = {
    done:       '#C6F6D5',
    failed:     '#FEEBC8',
    processing: '#BEE3F8',
    pending:    '#E9D8FD',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {chunks.map((c: any) => (
        <div key={c.id} style={{
          display: 'grid',
          gridTemplateColumns: '28px 80px 1fr auto',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.4rem 0.6rem',
          background: chunkBgs[c.status] ?? '#F5F5F5',
          border: `2px solid ${chunkColors[c.status] ?? '#999'}`,
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
        }}>
          {/* Chunk # */}
          <span style={{ color: chunkColors[c.status] ?? '#555' }}>#{c.id}</span>

          {/* Status */}
          <span style={{ color: chunkColors[c.status] ?? '#555', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>
            {c.status}
          </span>

          {/* Records range */}
          <span style={{ color: '#555' }}>
            Records {c.fromIdx}–{c.toIdx - 1}
            {c.keyLabel && (
              <span style={{ marginLeft: '0.75rem', color: c.keyLabel?.startsWith('mistral') ? '#2B6CB0' : '#D53F8C' }}>
                via {c.keyLabel}
              </span>
            )}
            {c.attempts && c.attempts.length > 1 && (
              <span style={{ marginLeft: '0.5rem', color: '#888' }}>
                (tried: {c.attempts.join(' → ')})
              </span>
            )}
          </span>

          {/* Provider badge */}
          {c.provider && c.provider !== 'none' && (
            <span style={{
              fontSize: '0.6rem', padding: '1px 6px',
              background: c.provider === 'mistral' ? '#2B6CB0' : '#D53F8C',
              color: '#FFF', fontFamily: 'var(--font-heading)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {c.provider}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
