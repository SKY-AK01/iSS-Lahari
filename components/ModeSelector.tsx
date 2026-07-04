'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Timer, Check, X, Minus } from 'lucide-react';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  batch: any;
}

export default function ModeSelector({ batch }: Props) {
  const [mode, setMode] = useState<'practice' | 'exam' | null>(null);
  const [duration, setDuration] = useState(20);
  const [markingCorrect, setMarkingCorrect] = useState(2);
  const [markingWrong, setMarkingWrong] = useState(0.5);
  const [markingPartial, setMarkingPartial] = useState(1);
  const router = useRouter();

  const mix = batch.difficulty_mix as Record<string, number> | null;

  async function startPractice() {
    // Create attempt record first
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        mode: 'practice',
        markingCorrect, markingWrong: 0, markingPartial: 0,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/student/test/${batch.id}/practice?attemptId=${data.attemptId}`);
  }

  async function startExam() {
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: batch.id,
        mode: 'exam',
        examDurationMinutes: duration,
        markingCorrect, markingWrong, markingPartial,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/student/test/${batch.id}/exam?attemptId=${data.attemptId}&duration=${duration}`);
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '640px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student')} style={{ marginBottom: '1.25rem' }}>
        ← Back
      </button>

      {/* Batch Info — Admit Card style */}
      <div className="animate-up" style={{
        background: 'linear-gradient(135deg, var(--bg-2) 0%, var(--bg-3) 100%)',
        border: '1px solid rgba(250,160,160,0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'var(--ruby-subtle)', filter: 'blur(30px)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', position: 'relative' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ruby)', marginBottom: '0.3rem' }}>
              {batch.chapter?.subject?.name}
            </div>
            <h2 style={{ fontSize: '1.3rem', lineHeight: 1.2 }}>{batch.chapter?.name}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="batch-badge" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>Batch {batch.batch_number}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--cream)' }}>
              {batch.question_count} Qs
            </div>
          </div>
        </div>

        {/* Dashed divider like a ticket */}
        <div style={{ borderTop: '1.5px dashed var(--bg-4)', margin: '1rem 0' }} />

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {mix && ['easy', 'medium', 'hard'].map(d => (
            <div key={d} className="admit-card-stat">
              <span className="label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
              <span className="value" style={{ color: d === 'easy' ? 'var(--sage)' : d === 'medium' ? 'var(--partial)' : 'var(--clay)' }}>
                {mix[d] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mode chooser */}
      {!mode && (
        <div className="animate-up stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            id="start-practice"
            className="card animate-up"
            style={{ cursor: 'pointer', border: '1.5px solid var(--bg-4)', textAlign: 'left', padding: '1.5rem' }}
            onClick={() => setMode('practice')}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--sage)';
              (e.currentTarget as HTMLElement).style.background = 'var(--sage-bg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-4)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)';
            }}
          >
            <div style={{ marginBottom: '0.75rem', color: 'var(--sage)' }}><BookOpen size={32} strokeWidth={1.5} /></div>
            <h3 style={{ fontSize: '1rem', color: 'var(--sage)', marginBottom: '0.4rem' }}>Practice Mode</h3>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
              Untimed. See the full study card immediately after each answer.
              Best for learning and revision.
            </p>
          </button>

          <button
            id="start-exam"
            className="card animate-up"
            style={{ cursor: 'pointer', border: '1.5px solid var(--bg-4)', textAlign: 'left', padding: '1.5rem' }}
            onClick={() => setMode('exam')}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--ruby)';
              (e.currentTarget as HTMLElement).style.background = 'var(--ruby-subtle)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-4)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)';
            }}
          >
            <div style={{ marginBottom: '0.75rem', color: 'var(--ruby)' }}><Timer size={32} strokeWidth={1.5} /></div>
            <h3 style={{ fontSize: '1rem', color: 'var(--ruby)', marginBottom: '0.4rem' }}>Exam Mode</h3>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
              Timed. Navigate freely, flag questions, review before submitting.
              Simulates real CGL conditions.
            </p>
          </button>
        </div>
      )}

      {/* Practice config */}
      {mode === 'practice' && (
        <div className="card animate-up" style={{ padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} /> Practice Mode</h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            No timer. You'll get instant feedback and the full study card after every answer.
            Score recorded as % correct (no negative marking in practice).
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>← Back</button>
            <button id="confirm-practice" className="btn btn-primary" onClick={startPractice} style={{ flex: 1, justifyContent: 'center' }}>
              Start Practice →
            </button>
          </div>
        </div>
      )}

      {/* Exam config */}
      {mode === 'exam' && (
        <div className="card animate-up" style={{ padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Timer size={20} /> Exam Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input
                id="exam-duration"
                type="number"
                className="input"
                min={5} max={180}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Correct</label>
                <input id="marking-correct" type="number" className="input" step={0.5} min={0} value={markingCorrect} onChange={e => setMarkingCorrect(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={14} /> Wrong</label>
                <input id="marking-wrong" type="number" className="input" step={0.25} min={0} value={markingWrong} onChange={e => setMarkingWrong(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Minus size={14} /> Partial</label>
                <input id="marking-partial" type="number" className="input" step={0.5} min={0} value={markingPartial} onChange={e => setMarkingPartial(Number(e.target.value))} />
              </div>
            </div>
            <div className="alert alert-info" style={{ fontSize: '0.82rem' }}>
              Max score: {batch.question_count} × {markingCorrect} = {(batch.question_count * markingCorrect).toFixed(1)} pts
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>← Back</button>
            <button id="confirm-exam" className="btn btn-primary" onClick={startExam} style={{ flex: 1, justifyContent: 'center' }}>
              Start Exam →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
