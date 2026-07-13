'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Timer, Check, X, Minus, RotateCcw } from 'lucide-react';

interface PreviousAttempt {
  id: string;
  mode: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string;
  submitted_at: string | null;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  batch: any;
  previousAttempts: PreviousAttempt[];
}

export default function ModeSelector({ batch, previousAttempts }: Props) {
  const [mode, setMode] = useState<'practice' | 'exam' | null>(null);
  const [duration, setDuration] = useState(20);
  const [markingCorrect, setMarkingCorrect] = useState(2);
  const [markingWrong, setMarkingWrong] = useState(0.5);
  const [markingPartial, setMarkingPartial] = useState(1);
  const [starting, setStarting] = useState(false);
  const router = useRouter();

  const mix = batch.difficulty_mix as Record<string, number> | null;
  const hasAttempts = previousAttempts.length > 0;

  // Best scores
  const bestExam = previousAttempts
    .filter(a => a.mode === 'exam' && a.percentage != null)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0];
  const bestPractice = previousAttempts
    .filter(a => a.mode === 'practice' && a.percentage != null)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0];

  const unfinishedPractice = previousAttempts.find(a => a.mode === 'practice' && !a.submitted_at);
  const finishedAttempts = previousAttempts.filter(a => a.submitted_at);
  const hasFinishedAttempts = finishedAttempts.length > 0;

  async function startPractice() {
    setStarting(true);
    if (unfinishedPractice) {
      router.push(`/student/test/${batch.id}/practice?attemptId=${unfinishedPractice.id}`);
      return;
    }
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        mode: 'practice',
        markingCorrect: 1, markingWrong: 0, markingPartial: 0,
        questionCount: batch.question_count, // skip extra DB lookup
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/student/test/${batch.id}/practice?attemptId=${data.attemptId}`);
    else setStarting(false);
  }

  async function startFreshPractice() {
    setStarting(true);
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        mode: 'practice',
        markingCorrect: 1, markingWrong: 0, markingPartial: 0,
        questionCount: batch.question_count,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/student/test/${batch.id}/practice?attemptId=${data.attemptId}`);
    else setStarting(false);
  }

  async function startExam() {
    setStarting(true);
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        mode: 'exam',
        examDurationMinutes: duration,
        markingCorrect, markingWrong, markingPartial,
        questionCount: batch.question_count, // skip extra DB lookup
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/student/test/${batch.id}/exam?attemptId=${data.attemptId}&duration=${duration}`);
    else setStarting(false);
  }

  function scoreColor(pct: number) {
    return pct >= 60 ? 'var(--sage)' : pct >= 40 ? 'var(--partial)' : 'var(--ruby)';
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginBottom: '1.25rem' }}>
        ← Back
      </button>

      {/* Batch Info */}
      <div className="animate-up card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ruby)', marginBottom: '0.25rem' }}>
              {batch.chapter?.subject?.name}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', lineHeight: 1.2 }}>
              {batch.chapter?.name}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className="batch-badge" style={{ display: 'block', marginBottom: '0.3rem' }}>Batch {batch.batch_number}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700 }}>{batch.question_count} Qs</span>
          </div>
        </div>
        <div style={{ borderTop: '2px dashed #000', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem' }}>
          {mix && ['easy', 'medium', 'hard'].map(d => (
            <div key={d} className="admit-card-stat">
              <span className="label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
              <span className="value" style={{ color: d === 'easy' ? 'var(--sage)' : d === 'medium' ? 'var(--partial)' : 'var(--ruby)' }}>
                {mix[d] || 0}
              </span>
            </div>
          ))}
          {hasAttempts && (
            <div className="admit-card-stat" style={{ marginLeft: 'auto' }}>
              <span className="label">Attempts</span>
              <span className="value">{previousAttempts.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Previous attempts summary */}
      {hasAttempts && (
        <div className="animate-up card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your History — {previousAttempts.length} attempt{previousAttempts.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {bestPractice && (
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Practice best: <span style={{ color: scoreColor(bestPractice.percentage!) }}>{bestPractice.percentage!.toFixed(1)}%</span>
                </span>
              )}
              {bestExam && (
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Exam best: <span style={{ color: scoreColor(bestExam.percentage!) }}>{bestExam.percentage!.toFixed(1)}%</span>
                </span>
              )}
            </div>
          </div>

          {/* Timeline of all attempts including in-progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
            {previousAttempts.map((a, i) => {
              const isInProgress = !a.submitted_at;
              return (
                <div
                  key={a.id}
                  onClick={() => isInProgress
                    ? router.push(`/student/test/${batch.id}/practice?attemptId=${a.id}`)
                    : router.push(`/student/results/${a.id}`)
                  }
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.55rem 0.75rem',
                    border: isInProgress ? '1.5px dashed #999' : 'var(--border-thin)',
                    background: isInProgress ? 'var(--sage-bg)' : 'var(--bg)',
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sage)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isInProgress ? 'var(--sage-bg)' : 'var(--bg)')}
                >
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.4, minWidth: '1.2rem' }}>#{previousAttempts.length - i}</span>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                    padding: '2px 7px',
                    background: a.mode === 'exam' ? 'var(--ruby)' : '#000',
                    color: '#FFF',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}>
                    {a.mode}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', opacity: 0.6, flex: 1 }}>
                    {a.submitted_at
                      ? new Date(a.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : `Started ${new Date(a.started_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                  {isInProgress ? (
                    <span style={{
                      fontSize: '0.65rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                      background: 'var(--ruby)', color: '#FFF',
                      padding: '2px 7px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>In Progress</span>
                  ) : (
                    <>
                      {a.percentage != null && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: scoreColor(a.percentage), flexShrink: 0 }}>
                          {a.percentage.toFixed(1)}%
                        </span>
                      )}
                      {a.score != null && a.max_score != null && (
                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.5, flexShrink: 0 }}>
                          {a.score}/{a.max_score}
                        </span>
                      )}
                    </>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--ruby)', flexShrink: 0 }}>→</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode chooser */}
      {!mode && (
        <div className="animate-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Unfinished attempt banner */}
          {unfinishedPractice && (
            <div style={{
              border: '2px solid #000',
              background: 'var(--sage-bg)',
              padding: '1.25rem',
              marginBottom: '0.25rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '0.65rem', fontFamily: 'var(--font-heading)', fontWeight: 900,
                  background: 'var(--ruby)', color: '#FFF', padding: '2px 8px',
                  letterSpacing: '0.06em', textTransform: 'uppercase'
                }}>● IN PROGRESS</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)' }}>
                  Practice — started {new Date(unfinishedPractice.started_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', marginBottom: '1rem', textTransform: 'none', fontWeight: 400, lineHeight: 1.5 }}>
                You have an unfinished practice session. Resume where you left off, or start a fresh attempt.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  disabled={starting}
                  onClick={startPractice}
                  style={{ flex: 1, justifyContent: 'center', minWidth: '120px' }}
                >
                  {starting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading…</> : 'Resume Practice →'}
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={starting}
                  onClick={startFreshPractice}
                  style={{ justifyContent: 'center', minWidth: '120px' }}
                >
                  Start Fresh
                </button>
              </div>
            </div>
          )}

          {hasAttempts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <RotateCcw size={14} />
              <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.6 }}>
                {unfinishedPractice ? 'Or take a different mode' : 'Take Again'}
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {!unfinishedPractice && (
              <button
                id="start-practice"
                className="card"
                style={{ cursor: 'pointer', border: 'var(--border-thick)', textAlign: 'left', padding: '1.25rem', background: 'var(--bg-3)' }}
                onClick={() => setMode('practice')}
              >
                <div style={{ marginBottom: '0.6rem', color: '#000' }}><BookOpen size={28} strokeWidth={2} /></div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Practice</div>
                <p style={{ fontSize: '0.78rem', lineHeight: 1.5, textTransform: 'none', fontWeight: 400 }}>
                  Untimed. Instant feedback after each answer. Best for learning.
                </p>
              </button>
            )}

            <button
              id="start-exam"
              className="card"
              style={{ cursor: 'pointer', border: '3px solid var(--ruby)', textAlign: 'left', padding: '1.25rem', background: 'var(--ruby-subtle)', gridColumn: unfinishedPractice ? '1 / -1' : undefined }}
              onClick={() => setMode('exam')}
            >
              <div style={{ marginBottom: '0.6rem', color: 'var(--ruby)' }}><Timer size={28} strokeWidth={2} /></div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.3rem', color: 'var(--ruby)' }}>Exam</div>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.5, textTransform: 'none', fontWeight: 400 }}>
                Timed. Navigate freely, flag questions. Simulates real exam.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Practice config */}
      {mode === 'practice' && (
        <div className="card animate-up" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} /> Practice Mode
          </div>
          <p style={{ marginBottom: '1.25rem', fontSize: '0.88rem', textTransform: 'none', fontWeight: 400 }}>
            No timer. Instant study card after every answer. Score saved as % correct.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>← Back</button>
            <button id="confirm-practice" className="btn btn-primary" onClick={startPractice} disabled={starting} style={{ flex: 1, justifyContent: 'center' }}>
              {starting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Starting…</> : (unfinishedPractice ? 'Resume Practice →' : 'Start Practice →')}
            </button>
          </div>
        </div>
      )}

      {/* Exam config */}
      {mode === 'exam' && (
        <div className="card animate-up" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ruby)' }}>
            <Timer size={18} /> Exam Settings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input id="exam-duration" type="number" className="input" min={5} max={180} value={duration} onChange={e => setDuration(Number(e.target.value))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={12} /> Correct</label>
                <input id="marking-correct" type="number" className="input" step={0.5} min={0} value={markingCorrect} onChange={e => setMarkingCorrect(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={12} /> Wrong</label>
                <input id="marking-wrong" type="number" className="input" step={0.25} min={0} value={markingWrong} onChange={e => setMarkingWrong(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Minus size={12} /> Partial</label>
                <input id="marking-partial" type="number" className="input" step={0.5} min={0} value={markingPartial} onChange={e => setMarkingPartial(Number(e.target.value))} />
              </div>
            </div>
            <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
              Max score: {batch.question_count} × {markingCorrect} = {(batch.question_count * markingCorrect).toFixed(1)} pts
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>← Back</button>
            <button id="confirm-exam" className="btn btn-primary" onClick={startExam} disabled={starting} style={{ flex: 1, justifyContent: 'center' }}>
              {starting ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Starting…</> : 'Start Exam →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
